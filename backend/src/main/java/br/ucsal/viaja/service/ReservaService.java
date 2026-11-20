package br.ucsal.viaja.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.ucsal.viaja.domain.Fornecedor;
import br.ucsal.viaja.domain.Hospedagem;
import br.ucsal.viaja.domain.Oferta;
import br.ucsal.viaja.domain.Passagem;
import br.ucsal.viaja.domain.Passeio;
import br.ucsal.viaja.domain.Reserva;
import br.ucsal.viaja.domain.StatusReserva;
import br.ucsal.viaja.domain.TipoNotificacao;
import br.ucsal.viaja.domain.Usuario;
import br.ucsal.viaja.domain.Viajante;
import br.ucsal.viaja.dto.Requisicoes.ReservaForm;
import br.ucsal.viaja.dto.ReservaDTO;
import br.ucsal.viaja.exception.NaoEncontradoException;
import br.ucsal.viaja.exception.RegraNegocioException;
import br.ucsal.viaja.repository.ReservaRepository;
import br.ucsal.viaja.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;

/**
 * Fluxo de reserva sem pagamento, igual ao BPMN da seção 7: o viajante solicita (RF-10),
 * o fornecedor aceita ou recusa (RF-11), o viajante pode cancelar (RF-12) e solicitações
 * sem resposta expiram sozinhas (RN-07). Toda mudança de status gera notificação (RF-14).
 */
@Service
@RequiredArgsConstructor
@Transactional
public class ReservaService {

    private static final Logger log = LoggerFactory.getLogger(ReservaService.class);

    private final ReservaRepository reservas;
    private final UsuarioRepository usuarios;
    private final OfertaService ofertaService;
    private final NotificacaoService notificacoes;

    // ---------------------------------------------------------------- viajante

    @Transactional(readOnly = true)
    public List<ReservaDTO> listarDoViajante(Long viajanteId) {
        return reservas.doViajante(viajanteId).stream().map(ReservaDTO::de).toList();
    }

    public ReservaDTO solicitar(Long viajanteId, ReservaForm form) {
        Viajante viajante = buscarViajante(viajanteId);
        Oferta oferta = ofertaService.buscar(form.ofertaId());
        return ReservaDTO.de(criar(viajante, oferta, form.pessoas(), form.dataInicio(), form.noites()));
    }

    /**
     * Cria a solicitação validando datas e vagas (caso de uso "Validar datas e vagas").
     * Também é usado pelo itinerário para solicitar todos os itens de uma vez.
     */
    public Reserva criar(Viajante viajante, Oferta oferta, int pessoas, LocalDate checkin, Integer noites) {
        // RN-01: só maiores de 18 anos solicitam reservas.
        if (!viajante.maiorDeIdade(LocalDate.now())) {
            throw new RegraNegocioException("É preciso ter 18 anos ou mais para solicitar reservas.");
        }
        Fornecedor fornecedor = oferta.getFornecedor();
        if (!oferta.isAtiva() || !fornecedor.podePublicar()) {
            throw new RegraNegocioException("\"" + oferta.getTitulo() + "\" não está mais disponível.");
        }
        // RN-02: sem vagas, sem solicitação.
        int unidades = oferta.unidadesPara(pessoas);
        if (!oferta.verificarDisponibilidade(unidades)) {
            throw new RegraNegocioException("Não há vagas suficientes para \"" + oferta.getTitulo()
                    + "\" (restam " + oferta.getVagas() + ").");
        }

        Reserva reserva = new Reserva();
        if (oferta instanceof Passagem passagem) {
            reserva.setDataInicio(passagem.getPartida());
            reserva.setDataFim(passagem.getChegada());
        } else if (oferta instanceof Passeio passeio) {
            reserva.setDataInicio(passeio.inicio());
            reserva.setDataFim(passeio.fim());
        } else if (oferta instanceof Hospedagem) {
            if (checkin == null || noites == null || noites < 1) {
                throw new RegraNegocioException("Informe a data de check-in e o número de noites.");
            }
            reserva.setNoites(noites);
            reserva.setDataInicio(checkin.atTime(14, 0));
            reserva.setDataFim(checkin.plusDays(noites).atTime(12, 0));
        }
        if (!reserva.getDataInicio().isAfter(LocalDateTime.now())) {
            throw new RegraNegocioException("A data de \"" + oferta.getTitulo() + "\" já passou.");
        }

        reserva.setViajante(viajante);
        reserva.setOferta(oferta);
        reserva.setPessoas(pessoas);
        reserva.setQuantidade(unidades);
        reserva.setValorTotal(oferta.custoPara(pessoas, reserva.getNoites()));
        reservas.save(reserva);

        notificacoes.notificar(fornecedor, TipoNotificacao.NOVA_SOLICITACAO,
                viajante.getNome() + " solicitou \"" + oferta.getTitulo() + "\" para " + pessoas
                        + (pessoas == 1 ? " pessoa" : " pessoas") + ", com início em "
                        + reserva.getDataInicio().format(Texto.DIA_MES_HORA) + ". Responda em até "
                        + Reserva.HORAS_PARA_EXPIRAR + " horas.");
        return reserva;
    }

    /** RF-12 e RN-03: cancelamento simples, sem reembolso, até 48 horas antes do início. */
    public ReservaDTO cancelar(Long viajanteId, Long reservaId) {
        Reserva reserva = reservas.findById(reservaId)
                .filter(r -> r.getViajante().getId().equals(viajanteId))
                .orElseThrow(() -> new NaoEncontradoException("Reserva não encontrada."));
        reserva.cancelar(LocalDateTime.now());
        notificacoes.notificar(reserva.getOferta().getFornecedor(), TipoNotificacao.RESERVA_CANCELADA,
                reserva.getViajante().getNome() + " cancelou a reserva de \"" + reserva.getOferta().getTitulo()
                        + "\" com início em " + reserva.getDataInicio().format(Texto.DIA_MES_HORA) + ".");
        return ReservaDTO.de(reserva);
    }

    // ---------------------------------------------------------------- fornecedor (RF-11)

    @Transactional(readOnly = true)
    public List<ReservaDTO> listarDoFornecedor(Long fornecedorId, StatusReserva status) {
        return reservas.doFornecedor(fornecedorId).stream()
                .filter(r -> status == null || r.getStatus() == status)
                .map(ReservaDTO::de)
                .toList();
    }

    /** O aceite confirma a reserva, desconta as vagas (RN-02) e avisa o viajante. */
    public ReservaDTO aceitar(Long fornecedorId, Long reservaId) {
        Reserva reserva = buscarDoFornecedor(fornecedorId, reservaId);
        reserva.confirmar();
        notificacoes.notificar(reserva.getViajante(), TipoNotificacao.RESERVA_CONFIRMADA,
                "Sua reserva de \"" + reserva.getOferta().getTitulo() + "\" foi confirmada por "
                        + reserva.getOferta().getFornecedor().nomeExibicao() + ". Início em "
                        + reserva.getDataInicio().format(Texto.DIA_MES_HORA)
                        + ". O pagamento é combinado direto com o fornecedor.");
        return ReservaDTO.de(reserva);
    }

    public ReservaDTO recusar(Long fornecedorId, Long reservaId, String motivo) {
        Reserva reserva = buscarDoFornecedor(fornecedorId, reservaId);
        reserva.recusar(motivo);
        notificacoes.notificar(reserva.getViajante(), TipoNotificacao.RESERVA_RECUSADA,
                "Sua solicitação de \"" + reserva.getOferta().getTitulo() + "\" foi recusada"
                        + (reserva.getMotivo() == null ? "." : ". Motivo: " + reserva.getMotivo()));
        return ReservaDTO.de(reserva);
    }

    // ---------------------------------------------------------------- tarefas automáticas

    /** RN-07: solicitação sem resposta em 48 horas expira e o viajante é avisado. */
    @Scheduled(fixedDelayString = "PT5M", initialDelayString = "PT1M")
    public void expirarSolicitacoesSemResposta() {
        LocalDateTime limite = LocalDateTime.now().minusHours(Reserva.HORAS_PARA_EXPIRAR);
        List<Reserva> vencidas = reservas.findByStatusAndDataSolicitacaoBefore(StatusReserva.SOLICITADA, limite);
        for (Reserva reserva : vencidas) {
            reserva.expirar();
            notificacoes.notificar(reserva.getViajante(), TipoNotificacao.RESERVA_EXPIRADA,
                    "Sua solicitação de \"" + reserva.getOferta().getTitulo()
                            + "\" expirou porque o fornecedor não respondeu em " + Reserva.HORAS_PARA_EXPIRAR
                            + " horas. Você pode escolher outra oferta.");
        }
        if (!vencidas.isEmpty()) {
            log.info("{} solicitação(ões) expirada(s) por falta de resposta.", vencidas.size());
        }
    }

    /** RF-14: lembrete para reservas confirmadas que começam nas próximas 48 horas. */
    @Scheduled(fixedDelayString = "PT30M", initialDelayString = "PT2M")
    public void enviarLembretesDeViagem() {
        LocalDateTime agora = LocalDateTime.now();
        for (Reserva reserva : reservas.confirmadasSemLembrete(agora, agora.plusHours(48))) {
            reserva.setLembreteEnviado(true);
            notificacoes.notificar(reserva.getViajante(), TipoNotificacao.LEMBRETE_VIAGEM,
                    "Lembrete: \"" + reserva.getOferta().getTitulo() + "\" começa em "
                            + reserva.getDataInicio().format(Texto.DIA_MES_HORA) + ". Boa viagem!");
        }
    }

    // ---------------------------------------------------------------- apoio

    private Reserva buscarDoFornecedor(Long fornecedorId, Long reservaId) {
        return reservas.findById(reservaId)
                .filter(r -> r.getOferta().getFornecedor().getId().equals(fornecedorId))
                .orElseThrow(() -> new NaoEncontradoException("Solicitação não encontrada."));
    }

    private Viajante buscarViajante(Long viajanteId) {
        Usuario usuario = usuarios.findById(viajanteId)
                .orElseThrow(() -> new NaoEncontradoException("Usuário não encontrado."));
        if (usuario instanceof Viajante viajante) {
            return viajante;
        }
        throw new NaoEncontradoException("Usuário não encontrado.");
    }
}
