package br.ucsal.viaja.dto;

import java.time.LocalDate;
import java.util.List;

import br.ucsal.viaja.domain.Fornecedor;
import br.ucsal.viaja.domain.Perfil;
import br.ucsal.viaja.domain.Usuario;
import br.ucsal.viaja.domain.Viajante;

/** Dados do usuário expostos pela API. O hash da senha nunca sai do back-end. */
public record UsuarioDTO(
        Long id,
        String nome,
        String email,
        LocalDate dataNascimento,
        Perfil perfil,
        List<String> interesses,
        String razaoSocial,
        String cnpj,
        Boolean aprovado,
        Boolean bloqueado) {

    public static UsuarioDTO de(Usuario usuario) {
        List<String> interesses = usuario instanceof Viajante v ? List.copyOf(v.getInteresses()) : null;
        Fornecedor f = usuario instanceof Fornecedor fornecedor ? fornecedor : null;
        return new UsuarioDTO(
                usuario.getId(),
                usuario.getNome(),
                usuario.getEmail(),
                usuario.getDataNascimento(),
                usuario.getPerfil(),
                interesses,
                f == null ? null : f.getRazaoSocial(),
                f == null ? null : f.getCnpj(),
                f == null ? null : f.isAprovado(),
                f == null ? null : f.isBloqueado());
    }
}
