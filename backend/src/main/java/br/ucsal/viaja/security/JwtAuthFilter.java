package br.ucsal.viaja.security;

import java.io.IOException;
import java.util.List;

import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import br.ucsal.viaja.domain.Usuario;
import br.ucsal.viaja.repository.UsuarioRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

/**
 * Lê o cabeçalho "Authorization: Bearer token" e, se o token for válido e a conta ainda existir,
 * registra o usuário no contexto de segurança com a autoridade ROLE_PERFIL.
 */
@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private static final String PREFIXO = "Bearer ";

    private final JwtService jwtService;
    private final UsuarioRepository usuarios;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String cabecalho = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (cabecalho != null && cabecalho.startsWith(PREFIXO)) {
            jwtService.validar(cabecalho.substring(PREFIXO.length()).trim())
                    .filter(this::contaAtiva)
                    .ifPresent(logado -> SecurityContextHolder.getContext().setAuthentication(
                            new UsernamePasswordAuthenticationToken(logado, null,
                                    List.of(new SimpleGrantedAuthority("ROLE_" + logado.perfil().name())))));
        }
        chain.doFilter(request, response);
    }

    /** Conta excluída deixa de valer na hora, mesmo com token ainda dentro das 24 horas. */
    private boolean contaAtiva(UsuarioLogado logado) {
        return usuarios.findById(logado.id()).map(Usuario::isAtivo).orElse(false);
    }
}
