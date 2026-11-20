package br.ucsal.viaja.service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.ucsal.viaja.domain.Hospedagem;
import br.ucsal.viaja.domain.ItemItinerario;
import br.ucsal.viaja.domain.Itinerario;
import br.ucsal.viaja.domain.Oferta;
import br.ucsal.viaja.domain.Passagem;
import br.ucsal.viaja.domain.Passeio;
import br.ucsal.viaja.domain.Reserva;
import br.ucsal.viaja.domain.Usuario;
import br.ucsal.viaja.domain.Viajante;
import br.ucsal.viaja.dto.ItinerarioDTO;
import br.ucsal.viaja.dto.Requisicoes.ItemForm;
import br.ucsal.viaja.dto.Requisicoes.ItinerarioForm;
import br.ucsal.viaja.exception.NaoEncontradoException;
import br.ucsal.viaja.exception.RegraNegocioException;
import br.ucsal.viaja.repository.ItinerarioRepository;
import br.ucsal.viaja.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;

/**
 * Montagem de itinerário por dia (RF-08): junta passagens, hospedagens e passeios, calcula o custo
 * total e devolve os conflitos de data. Também solicita a reserva de todos os itens de uma vez (RF-10).
 */
@Service
@RequiredArgsConstructor
@Transactional
public class ItinerarioService {

    private static final int MAXIMO_DIAS = 30;
    private static final LocalTime HORARIO_CHECKIN = LocalTime.of(14, 0);

    private final ItinerarioRepository itinerarios;
    private final UsuarioRepository usuarios;
    private final OfertaService ofertaService;
    private final ReservaService reservaService;
    private final ValidadorItinerario validador;

    @Transactional(readOnly = true)
    public List<ItinerarioDTO> listar(Long viajanteId) {
        return itinerarios.findByViajanteIdOrderByDataInicioAscIdAsc(viajanteId).stream().map(this::paraDTO).toList();
    }

    @Transactional(readOnly = true)
    public ItinerarioDTO obter(Long viajanteId, Long id) {
        return paraDTO(buscar(viajanteId, id));
    }

    public ItinerarioDTO criar(Long viajanteId, ItinerarioForm form) {
        validarPeriodo(form.dataInicio(), form.dataFim());
        Itinerario it = new Itinerario();
        it.setViajante(buscarViajante(viajanteId));
        it.setNome(form.nome().trim());
        it.setDataInicio(form.dataInicio());
        it.setDataFim(form.dataFim());
        it.setPessoas(form.pessoas() == null ? 1 : form.pessoas());
        it.setGeradoPorIA(Boolean.TRUE.equals(form.geradoPorIA()));
        if (form.itens() != null) {
            form.itens().forEach(item -> it.adicionarItem(novoItem(it, item)));
        }
        it.recalcularCusto();
        return paraDTO(itinerarios.save(it));
    }

    public ItinerarioDTO atualizar(Long viajanteId, Long id, ItinerarioForm form) {
        validarPeriodo(form.dataInicio(), form.dataFim());
        Itinerario it = buscar(viajanteId, id);
        boolean mudouBase = !it.getDataInicio().equals(form.dataInicio())
                || (form.pessoas() != null && form.pessoas() != it.getPessoas());
        if (mudouBase && it.getItens().stream().anyMatch(ItemItinerario::temReservaAtiva)) {
            throw new RegraNegocioException(
                    "Este itinerário já tem reservas solicitadas. Cancele-as antes de mudar a data de início ou o número de pessoas.");
        }
        it.setNome(form.nome().trim());
        it.setDataInicio(form.dataInicio());
        it.setDataFim(form.dataFim());
        if (form.pessoas() != null) {
            it.setPessoas(form.pessoas());
        }
        it.recalcularCusto();
        return paraDTO(it);
    }

    public void excluir(Long viajanteId, Long id) {
        itinerarios.delete(buscar(viajanteId, id));
    }

    public ItinerarioDTO adicionarItem(Long viajanteId, Long id, ItemForm form) {
        Itinerario it = buscar(viajanteId, id);
        it.adicionarItem(novoItem(it, form));
        it.recalcularCusto();
        itinerarios.flush();
        return paraDTO(it);
    }

    public ItinerarioDTO atualizarItem(Long viajanteId, Long id, Long itemId, ItemForm form) {
        Itinerario it = buscar(viajanteId, id);
        ItemItinerario item = buscarItem(it, itemId);
        exigirSemReserva(item);
        if (form.dia() != null) {
            item.setDia(form.dia());
        }
        if (item.getOferta() instanceof Hospedagem) {
            if (form.noites() != null) {
                item.setNoites(form.noites());
            }
            if (form.horario() != null) {
                item.setHorario(form.horario());
            }
        }
        it.recalcularCusto();
        return paraDTO(it);
    }

    public ItinerarioDTO removerItem(Long viajanteId, Long id, Long itemId) {
        Itinerario it = buscar(viajanteId, id);
        ItemItinerario item = buscarItem(it, itemId);
        exigirSemReserva(item);
        it.removerItem(item);
        it.recalcularCusto();
        return paraDTO(it);
    }

    /** RF-10 e RN-08: solicita a reserva de cada item ainda sem reserva ativa, desde que não haja conflito. */
    public ItinerarioDTO solicitarReservas(Long viajanteId, Long id) {
        Itinerario it = buscar(viajanteId, id);
        List<String> conflitos = validador.validar(it);
        if (!conflitos.isEmpty()) {
            throw new RegraNegocioException(
                    "Corrija os conflitos do itinerário antes de solicitar as reservas: " + conflitos.get(0));
        }
        List<ItemItinerario> pendentes = it.getItens().stream().filter(item -> !item.temReservaAtiva()).toList();
        if (pendentes.isEmpty()) {
            throw new RegraNegocioException(it.getItens().isEmpty()
                    ? "Adicione pelo menos um item ao itinerário."
                    : "Todos os itens deste itinerário já têm reserva solicitada.");
        }
        for (ItemItinerario item : pendentes) {
            Reserva reserva = reservaService.criar(it.getViajante(), item.getOferta(), it.getPessoas(),
                    it.dataDoDia(item.getDia()), item.getNoites());
            item.setReserva(reserva);
        }
        return paraDTO(it);
    }

    // ---------------------------------------------------------------- apoio

    /**
     * Monta o item definindo dia, horário e noites. Sem dia informado: passagem e passeio entram no dia
     * da própria data; hospedagem entra no dia da chegada à cidade e fica até a saída.
     */
    private ItemItinerario novoItem(Itinerario it, ItemForm form) {
        if (form.ofertaId() == null) {
            throw new RegraNegocioException("Informe a oferta a adicionar.");
        }
        Oferta oferta = ofertaService.buscar(form.ofertaId());
        ItemItinerario item = new ItemItinerario();
        item.setOferta(oferta);

        if (oferta instanceof Passagem passagem) {
            item.setDia(form.dia() != null ? form.dia() : diaDaOferta(it, oferta, passagem.getPartida().toLocalDate()));
            item.setHorario(passagem.getPartida().toLocalTime());
        } else if (oferta instanceof Passeio passeio) {
            item.setDia(form.dia() != null ? form.dia() : diaDaOferta(it, oferta, passeio.getData()));
            item.setHorario(passeio.inicio().toLocalTime());
        } else if (oferta instanceof Hospedagem hospedagem) {
            int dia = form.dia() != null ? form.dia() : diaDeChegada(it, hospedagem.getCidade());
            item.setDia(dia);
            item.setNoites(form.noites() != null ? form.noites() : noitesAteASaida(it, hospedagem.getCidade(), dia));
            item.setHorario(form.horario() != null ? form.horario() : HORARIO_CHECKIN);
        }
        return item;
    }

    private int diaDaOferta(Itinerario it, Oferta oferta, LocalDate data) {
        int dia = it.diaDaData(data);
        if (dia < 1 || dia > it.totalDias()) {
            throw new RegraNegocioException("\"" + oferta.getTitulo() + "\" acontece em " + data.format(Texto.DIA_MES)
                    + ", fora do período do itinerário (" + it.getDataInicio().format(Texto.DIA_MES) + " a "
                    + it.getDataFim().format(Texto.DIA_MES) + "). Ajuste as datas ou escolha outra oferta.");
        }
        return dia;
    }

    private int diaDeChegada(Itinerario it, String cidade) {
        return passagensDoItinerario(it).stream()
                .filter(p -> Texto.igual(p.getDestino(), cidade))
                .min(Comparator.comparing(Passagem::getChegada))
                .map(p -> it.diaDaData(p.getChegada().toLocalDate()))
                .filter(dia -> dia >= 1 && dia <= it.totalDias())
                .orElse(1);
    }

    private int noitesAteASaida(Itinerario it, String cidade, int diaCheckin) {
        LocalDate checkin = it.dataDoDia(diaCheckin);
        LocalDate saida = passagensDoItinerario(it).stream()
                .filter(p -> Texto.igual(p.getOrigem(), cidade))
                .map(p -> p.getPartida().toLocalDate())
                .filter(data -> data.isAfter(checkin))
                .min(Comparator.naturalOrder())
                .orElse(it.getDataFim());
        return (int) Math.max(1, ChronoUnit.DAYS.between(checkin, saida));
    }

    private List<Passagem> passagensDoItinerario(Itinerario it) {
        return it.getItens().stream()
                .map(ItemItinerario::getOferta)
                .filter(Passagem.class::isInstance)
                .map(Passagem.class::cast)
                .toList();
    }

    private void exigirSemReserva(ItemItinerario item) {
        if (item.temReservaAtiva()) {
            throw new RegraNegocioException("Este item já tem reserva solicitada. Cancele a reserva antes de alterá-lo.");
        }
    }

    private void validarPeriodo(LocalDate inicio, LocalDate fim) {
        if (fim.isBefore(inicio)) {
            throw new RegraNegocioException("A data de fim precisa ser igual ou posterior à data de início.");
        }
        if (ChronoUnit.DAYS.between(inicio, fim) + 1 > MAXIMO_DIAS) {
            throw new RegraNegocioException("O itinerário pode ter no máximo " + MAXIMO_DIAS + " dias.");
        }
    }

    private Itinerario buscar(Long viajanteId, Long id) {
        return itinerarios.findByIdAndViajanteId(id, viajanteId)
                .orElseThrow(() -> new NaoEncontradoException("Itinerário não encontrado."));
    }

    private ItemItinerario buscarItem(Itinerario it, Long itemId) {
        return it.getItens().stream()
                .filter(item -> item.getId().equals(itemId))
                .findFirst()
                .orElseThrow(() -> new NaoEncontradoException("Item não encontrado no itinerário."));
    }

    private Viajante buscarViajante(Long viajanteId) {
        Usuario usuario = usuarios.findById(viajanteId)
                .orElseThrow(() -> new NaoEncontradoException("Usuário não encontrado."));
        if (usuario instanceof Viajante viajante) {
            return viajante;
        }
        throw new NaoEncontradoException("Usuário não encontrado.");
    }

    private ItinerarioDTO paraDTO(Itinerario it) {
        return ItinerarioDTO.de(it, validador.validar(it));
    }
}
