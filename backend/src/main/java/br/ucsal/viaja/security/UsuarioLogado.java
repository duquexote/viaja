package br.ucsal.viaja.security;

import br.ucsal.viaja.domain.Perfil;

/** Quem está fazendo a requisição, extraído do token JWT. É o "principal" do Spring Security. */
public record UsuarioLogado(Long id, String email, Perfil perfil) {
}
