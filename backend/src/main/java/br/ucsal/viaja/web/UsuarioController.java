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

import br.ucsal.viaja.dto.NotificacaoDTO;
import br.ucsal.viaja.dto.Requisicoes.PerfilUsuario;
import br.ucsal.viaja.dto.Requisicoes.Total;
import br.ucsal.viaja.dto.UsuarioDTO;
import br.ucsal.viaja.security.UsuarioLogado;
import br.ucsal.viaja.service.NotificacaoService;
import br.ucsal.viaja.service.UsuarioService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/** Conta do usuário logado, de qualquer perfil: perfil (RF-02) e notificações (RF-14). */
@RestController
@RequiredArgsConstructor
public class UsuarioController {

    private final UsuarioService usuarioService;
    private final NotificacaoService notificacaoService;

    @GetMapping("/api/usuarios/eu")
    public UsuarioDTO eu(@AuthenticationPrincipal UsuarioLogado logado) {
        return usuarioService.obter(logado.id());
    }

    @PutMapping("/api/usuarios/eu")
    public UsuarioDTO atualizar(@AuthenticationPrincipal UsuarioLogado logado, @Valid @RequestBody PerfilUsuario req) {
        return usuarioService.atualizar(logado.id(), req);
    }

    @DeleteMapping("/api/usuarios/eu")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void excluirConta(@AuthenticationPrincipal UsuarioLogado logado) {
        usuarioService.excluirConta(logado.id());
    }

    @GetMapping("/api/notificacoes")
    public List<NotificacaoDTO> notificacoes(@AuthenticationPrincipal UsuarioLogado logado) {
        return notificacaoService.listar(logado.id());
    }

    @GetMapping("/api/notificacoes/nao-lidas")
    public Total naoLidas(@AuthenticationPrincipal UsuarioLogado logado) {
        return new Total(notificacaoService.contarNaoLidas(logado.id()));
    }

    @PostMapping("/api/notificacoes/{id}/lida")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void marcarComoLida(@AuthenticationPrincipal UsuarioLogado logado, @PathVariable Long id) {
        notificacaoService.marcarComoLida(logado.id(), id);
    }

    @PostMapping("/api/notificacoes/lidas")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void marcarTodasComoLidas(@AuthenticationPrincipal UsuarioLogado logado) {
        notificacaoService.marcarTodasComoLidas(logado.id());
    }
}
