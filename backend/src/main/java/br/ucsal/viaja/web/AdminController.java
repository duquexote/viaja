package br.ucsal.viaja.web;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.ucsal.viaja.dto.AvaliacaoDTO;
import br.ucsal.viaja.dto.Requisicoes.Indicadores;
import br.ucsal.viaja.dto.UsuarioDTO;
import br.ucsal.viaja.service.AdminService;
import br.ucsal.viaja.service.AvaliacaoService;
import lombok.RequiredArgsConstructor;

/** Painel administrativo (RF-15): indicadores, fornecedores e moderação de avaliações. */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;
    private final AvaliacaoService avaliacaoService;

    @GetMapping("/indicadores")
    public Indicadores indicadores() {
        return adminService.indicadores();
    }

    @GetMapping("/fornecedores")
    public List<UsuarioDTO> fornecedores() {
        return adminService.listarFornecedores();
    }

    @PostMapping("/fornecedores/{id}/aprovar")
    public UsuarioDTO aprovar(@PathVariable Long id) {
        return adminService.aprovar(id);
    }

    @PostMapping("/fornecedores/{id}/bloquear")
    public UsuarioDTO bloquear(@PathVariable Long id) {
        return adminService.bloquear(id);
    }

    @GetMapping("/avaliacoes")
    public List<AvaliacaoDTO> avaliacoes() {
        return avaliacaoService.listarTodas();
    }

    @DeleteMapping("/avaliacoes/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removerAvaliacao(@PathVariable Long id) {
        avaliacaoService.remover(id);
    }
}
