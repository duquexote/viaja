package br.ucsal.viaja.web;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.ucsal.viaja.domain.StatusReserva;
import br.ucsal.viaja.dto.OfertaDTO;
import br.ucsal.viaja.dto.Requisicoes.Ativacao;
import br.ucsal.viaja.dto.Requisicoes.OfertaForm;
import br.ucsal.viaja.dto.Requisicoes.Recusa;
import br.ucsal.viaja.dto.ReservaDTO;
import br.ucsal.viaja.security.UsuarioLogado;
import br.ucsal.viaja.service.OfertaService;
import br.ucsal.viaja.service.ReservaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/** Painel do fornecedor: cadastro de ofertas (RF-03) e resposta às solicitações de reserva (RF-11). */
@RestController
@RequestMapping("/api/fornecedor")
@RequiredArgsConstructor
public class FornecedorController {

    private final OfertaService ofertaService;
    private final ReservaService reservaService;

    @GetMapping("/ofertas")
    public List<OfertaDTO> ofertas(@AuthenticationPrincipal UsuarioLogado logado) {
        return ofertaService.listarDoFornecedor(logado.id());
    }

    @PostMapping("/ofertas")
    @ResponseStatus(HttpStatus.CREATED)
    public OfertaDTO criar(@AuthenticationPrincipal UsuarioLogado logado, @Valid @RequestBody OfertaForm form) {
        return ofertaService.criar(logado.id(), form);
    }

    @PutMapping("/ofertas/{id}")
    public OfertaDTO atualizar(@AuthenticationPrincipal UsuarioLogado logado, @PathVariable Long id,
                               @Valid @RequestBody OfertaForm form) {
        return ofertaService.atualizar(logado.id(), id, form);
    }

    @PatchMapping("/ofertas/{id}/ativa")
    public OfertaDTO alterarAtiva(@AuthenticationPrincipal UsuarioLogado logado, @PathVariable Long id,
                                  @Valid @RequestBody Ativacao req) {
        return ofertaService.alterarAtiva(logado.id(), id, req.ativa());
    }

    @GetMapping("/reservas")
    public List<ReservaDTO> reservas(@AuthenticationPrincipal UsuarioLogado logado,
                                     @RequestParam(required = false) StatusReserva status) {
        return reservaService.listarDoFornecedor(logado.id(), status);
    }

    @PostMapping("/reservas/{id}/aceitar")
    public ReservaDTO aceitar(@AuthenticationPrincipal UsuarioLogado logado, @PathVariable Long id) {
        return reservaService.aceitar(logado.id(), id);
    }

    @PostMapping("/reservas/{id}/recusar")
    public ReservaDTO recusar(@AuthenticationPrincipal UsuarioLogado logado, @PathVariable Long id,
                              @Valid @RequestBody(required = false) Recusa req) {
        return reservaService.recusar(logado.id(), id, req == null ? null : req.motivo());
    }
}
