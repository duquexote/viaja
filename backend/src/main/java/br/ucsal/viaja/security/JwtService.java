package br.ucsal.viaja.security;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Date;
import java.util.Optional;

import javax.crypto.SecretKey;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import br.ucsal.viaja.domain.Perfil;
import br.ucsal.viaja.domain.Usuario;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

/** Emite e valida os tokens de sessão: JWT assinado com HMAC, válido por 24 horas (RNF-03). */
@Service
public class JwtService {

    private static final Logger log = LoggerFactory.getLogger(JwtService.class);

    private final SecretKey chave;
    private final Duration validade;

    public JwtService(@Value("${viaja.jwt.secret:}") String segredo,
                      @Value("${viaja.jwt.expiracao-horas:24}") long horas) {
        if (segredo == null || segredo.isBlank()) {
            this.chave = Jwts.SIG.HS256.key().build();
            log.warn("JWT_SECRET não definido: usando chave aleatória (os logins deixam de valer ao reiniciar a API).");
        } else {
            byte[] bytes = segredo.getBytes(StandardCharsets.UTF_8);
            if (bytes.length < 32) {
                throw new IllegalStateException("JWT_SECRET precisa ter pelo menos 32 caracteres.");
            }
            this.chave = Keys.hmacShaKeyFor(bytes);
        }
        this.validade = Duration.ofHours(horas);
    }

    public String gerar(Usuario usuario) {
        Date agora = new Date();
        return Jwts.builder()
                .subject(String.valueOf(usuario.getId()))
                .claim("email", usuario.getEmail())
                .claim("perfil", usuario.getPerfil().name())
                .issuedAt(agora)
                .expiration(new Date(agora.getTime() + validade.toMillis()))
                .signWith(chave)
                .compact();
    }

    /** Devolve vazio para token ausente, adulterado ou expirado. */
    public Optional<UsuarioLogado> validar(String token) {
        try {
            Claims claims = Jwts.parser().verifyWith(chave).build().parseSignedClaims(token).getPayload();
            return Optional.of(new UsuarioLogado(
                    Long.valueOf(claims.getSubject()),
                    claims.get("email", String.class),
                    Perfil.valueOf(claims.get("perfil", String.class))));
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
