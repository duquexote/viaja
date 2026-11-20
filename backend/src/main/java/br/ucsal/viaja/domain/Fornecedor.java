package br.ucsal.viaja.domain;

import jakarta.persistence.Column;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Empresa de transporte, hotel, pousada ou guia local que publica ofertas. */
@Entity
@DiscriminatorValue("FORNECEDOR")
@Getter
@Setter
@NoArgsConstructor
public class Fornecedor extends Usuario {

    @Column(length = 160)
    private String razaoSocial;

    @Column(length = 20)
    private String cnpj;

    /** RN-06: só publica ofertas depois de aprovado pelo administrador. */
    private Boolean aprovado = false;

    private Boolean bloqueado = false;

    @Override
    public Perfil getPerfil() {
        return Perfil.FORNECEDOR;
    }

    public boolean isAprovado() {
        return Boolean.TRUE.equals(aprovado);
    }

    public boolean isBloqueado() {
        return Boolean.TRUE.equals(bloqueado);
    }

    public boolean podePublicar() {
        return isAtivo() && isAprovado() && !isBloqueado();
    }

    public String nomeExibicao() {
        return razaoSocial != null && !razaoSocial.isBlank() ? razaoSocial : getNome();
    }
}
