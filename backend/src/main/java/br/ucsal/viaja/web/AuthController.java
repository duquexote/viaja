package br.ucsal.viaja.web;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.ucsal.viaja.dto.Requisicoes.Login;
import br.ucsal.viaja.dto.Requisicoes.LoginResposta;
import br.ucsal.viaja.dto.Requisicoes.Mensagem;
import br.ucsal.viaja.dto.Requisicoes.Registro;
import br.ucsal.viaja.dto.Requisicoes.RegistroResposta;
import br.ucsal.viaja.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/** Rotas públicas de cadastro, confirmação de e-mail e login (RF-01). */
@RestController
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @GetMapping("/api/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }

    @PostMapping("/api/auth/registrar")
    @ResponseStatus(HttpStatus.CREATED)
    public RegistroResposta registrar(@Valid @RequestBody Registro req) {
        return authService.registrar(req);
    }

    @GetMapping("/api/auth/confirmar")
    public Mensagem confirmar(@RequestParam String token) {
        return new Mensagem(authService.confirmarEmail(token));
    }

    @PostMapping("/api/auth/login")
    public LoginResposta login(@Valid @RequestBody Login req) {
        return authService.login(req);
    }
}
