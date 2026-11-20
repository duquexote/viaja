package br.ucsal.viaja.service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.ucsal.viaja.domain.Fornecedor;
import br.ucsal.viaja.domain.StatusReserva;
import br.ucsal.viaja.domain.TipoNotificacao;
import br.ucsal.viaja.dto.Requisicoes.Indicadores;
import br.ucsal.viaja.dto.UsuarioDTO;
import br.ucsal.viaja.exception.NaoEncontradoException;
import br.ucsal.viaja.repository.AvaliacaoRepository;
import br.ucsal.viaja.repository.ItinerarioRepository;
import br.ucsal.viaja.repository.OfertaRepository;
import br.ucsal.viaja.repository.ReservaRepository;
import br.ucsal.viaja.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;

/** Painel administrativo (RF-15): indicadores de uso e aprovação ou bloqueio de fornecedores. */
@Service
@RequiredArgsConstructor
@Transactional
public class AdminService {

    private final UsuarioRepository usuarios;
    private final OfertaRepository ofertas;
    private final ReservaRepository reservas;
    private final ItinerarioRepository itinerarios;
    private final AvaliacaoRepository avaliacoes;
    private final NotificacaoService notificacoes;

    @Transactional(readOnly = true)
    public Indicadores indicadores() {
        Map<String, Long> porStatus = new LinkedHashMap<>();
        for (StatusReserva status : StatusReserva.values()) {
            porStatus.put(status.name(), reservas.countByStatus(status));
        }
        return new Indicadores(
                usuarios.countByAtivoTrue(),
                usuarios.totalViajantes(),
                usuarios.totalFornecedores(),
                usuarios.fornecedoresPendentes(),
                ofertas.countByAtivaTrue(),
                itinerarios.count(),
                reservas.count(),
                porStatus,
                avaliacoes.count());
    }

    @Transactional(readOnly = true)
    public List<UsuarioDTO> listarFornecedores() {
        return usuarios.fornecedores().stream().map(UsuarioDTO::de).toList();
    }

    /** RN-06: a aprovação libera o fornecedor para publicar ofertas. */
    public UsuarioDTO aprovar(Long fornecedorId) {
        Fornecedor fornecedor = buscarFornecedor(fornecedorId);
        fornecedor.setAprovado(true);
        fornecedor.setBloqueado(false);
        notificacoes.notificar(fornecedor, TipoNotificacao.FORNECEDOR_APROVADO,
                "Seu cadastro foi aprovado. Você já pode publicar ofertas no ViaJá.");
        return UsuarioDTO.de(fornecedor);
    }

    /** Fornecedor bloqueado some das buscas e não publica nem recebe novas solicitações. */
    public UsuarioDTO bloquear(Long fornecedorId) {
        Fornecedor fornecedor = buscarFornecedor(fornecedorId);
        fornecedor.setBloqueado(true);
        notificacoes.notificar(fornecedor, TipoNotificacao.FORNECEDOR_BLOQUEADO,
                "Seu cadastro foi bloqueado pelo administrador. Suas ofertas não aparecem mais nas buscas.");
        return UsuarioDTO.de(fornecedor);
    }

    private Fornecedor buscarFornecedor(Long id) {
        return usuarios.findById(id)
                .filter(u -> u instanceof Fornecedor && u.isAtivo())
                .map(u -> (Fornecedor) u)
                .orElseThrow(() -> new NaoEncontradoException("Fornecedor não encontrado."));
    }
}
