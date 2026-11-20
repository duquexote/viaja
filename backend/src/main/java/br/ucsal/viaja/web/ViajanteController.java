package br.ucsal.viaja.web;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.ucsal.viaja.dto.AvaliacaoDTO;
import br.ucsal.viaja.dto.ItinerarioDTO;
import br.ucsal.viaja.dto.Requisicoes.AvaliacaoForm;
import br.ucsal.viaja.dto.Requisicoes.ItemForm;
import br.ucsal.viaja.dto.Requisicoes.ItinerarioForm;
import br.ucsal.viaja.dto.Requisicoes.PedidoRoteiro;
import br.ucsal.viaja.dto.Requisicoes.ReservaForm;
import br.ucsal.viaja.dto.Requisicoes.UsoAssistente;
import br.ucsal.viaja.dto.ReservaDTO;
import br.ucsal.viaja.dto.RoteiroDTO;
import br.ucsal.viaja.security.UsuarioLogado;
import br.ucsal.viaja.service.AvaliacaoService;
import br.ucsal.viaja.service.ItinerarioService;
import br.ucsal.viaja.service.ReservaService;
import br.ucsal.viaja.service.ia.AssistenteIAService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * Rotas do viajante: itinerários (RF-08), assistente de IA (RF-09), reservas (RF-10 e RF-12)
 * e avaliações (RF-13). O acesso é restrito ao perfil VIAJANTE em SecurityConfig.
 */
@RestController
@RequiredArgsConstructor
public class ViajanteController {

    private final ItinerarioService itinerarioService;
    private final ReservaService reservaService;
    private final AvaliacaoService avaliacaoService;
    private final AssistenteIAService assistente;

    // ---------- Itinerários ----------

    @GetMapping("/api/itinerarios")
    public List<ItinerarioDTO> itinerarios(@AuthenticationPrincipal UsuarioLogado logado) {
        return itinerarioService.listar(logado.id());
    }

    @PostMapping("/api/itinerarios")
    @ResponseStatus(HttpStatus.CREATED)
    public ItinerarioDTO criarItinerario(@AuthenticationPrincipal UsuarioLogado logado,
                                         @Valid @RequestBody ItinerarioForm form) {
        return itinerarioService.criar(logado.id(), form);
    }

    @GetMapping("/api/itinerarios/{id}")
    public ItinerarioDTO itinerario(@AuthenticationPrincipal UsuarioLogado logado, @PathVariable Long id) {
        return itinerarioService.obter(logado.id(), id);
    }

    @PutMapping("/api/itinerarios/{id}")
    public ItinerarioDTO atualizarItinerario(@AuthenticationPrincipal UsuarioLogado logado, @PathVariable Long id,
                                             @Valid @RequestBody ItinerarioForm form) {
        return itinerarioService.atualizar(logado.id(), id, form);
    }

    @DeleteMapping("/api/itinerarios/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void excluirItinerario(@AuthenticationPrincipal UsuarioLogado logado, @PathVariable Long id) {
        itinerarioService.excluir(logado.id(), id);
    }

    @PostMapping("/api/itinerarios/{id}/itens")
    public ItinerarioDTO adicionarItem(@AuthenticationPrincipal UsuarioLogado logado, @PathVariable Long id,
                                       @Valid @RequestBody ItemForm form) {
        return itinerarioService.adicionarItem(logado.id(), id, form);
    }

    @PutMapping("/api/itinerarios/{id}/itens/{itemId}")
    public ItinerarioDTO atualizarItem(@AuthenticationPrincipal UsuarioLogado logado, @PathVariable Long id,
                                       @PathVariable Long itemId, @Valid @RequestBody ItemForm form) {
        return itinerarioService.atualizarItem(logado.id(), id, itemId, form);
    }

    @DeleteMapping("/api/itinerarios/{id}/itens/{itemId}")
    public ItinerarioDTO removerItem(@AuthenticationPrincipal UsuarioLogado logado, @PathVariable Long id,
                                     @PathVariable Long itemId) {
        return itinerarioService.removerItem(logado.id(), id, itemId);
    }

    @PostMapping("/api/itinerarios/{id}/solicitar")
    public ItinerarioDTO solicitarReservas(@AuthenticationPrincipal UsuarioLogado logado, @PathVariable Long id) {
        return itinerarioService.solicitarReservas(logado.id(), id);
    }

    // ---------- Reservas e avaliações ----------

    @GetMapping("/api/reservas")
    public List<ReservaDTO> reservas(@AuthenticationPrincipal UsuarioLogado logado) {
        return reservaService.listarDoViajante(logado.id());
    }

    @PostMapping("/api/reservas")
    @ResponseStatus(HttpStatus.CREATED)
    public ReservaDTO solicitarReserva(@AuthenticationPrincipal UsuarioLogado logado,
                                       @Valid @RequestBody ReservaForm form) {
        return reservaService.solicitar(logado.id(), form);
    }

    @PostMapping("/api/reservas/{id}/cancelar")
    public ReservaDTO cancelarReserva(@AuthenticationPrincipal UsuarioLogado logado, @PathVariable Long id) {
        return reservaService.cancelar(logado.id(), id);
    }

    @PostMapping("/api/reservas/{id}/avaliacao")
    @ResponseStatus(HttpStatus.CREATED)
    public AvaliacaoDTO avaliar(@AuthenticationPrincipal UsuarioLogado logado, @PathVariable Long id,
                                @Valid @RequestBody AvaliacaoForm form) {
        return avaliacaoService.avaliar(logado.id(), id, form);
    }

    // ---------- Assistente de roteiro com IA ----------

    @GetMapping("/api/assistente/uso")
    public UsoAssistente usoDoAssistente(@AuthenticationPrincipal UsuarioLogado logado) {
        return assistente.uso(logado.id());
    }

    @PostMapping("/api/assistente/roteiro")
    public RoteiroDTO gerarRoteiro(@AuthenticationPrincipal UsuarioLogado logado,
                                   @Valid @RequestBody PedidoRoteiro pedido) {
        return assistente.gerarRoteiro(logado.id(), pedido);
    }
}
