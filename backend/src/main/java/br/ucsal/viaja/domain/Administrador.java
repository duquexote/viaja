package br.ucsal.viaja.domain;

import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Cuida da plataforma: aprova fornecedores, modera avaliações e acompanha indicadores. */
@Entity
@DiscriminatorValue("ADMINISTRADOR")
@Getter
@Setter
@NoArgsConstructor
public class Administrador extends Usuario {

    private Integer nivelAcesso = 1;

    @Override
    public Perfil getPerfil() {
        return Perfil.ADMINISTRADOR;
    }
}
