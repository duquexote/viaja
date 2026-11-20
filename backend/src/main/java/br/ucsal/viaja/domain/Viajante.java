package br.ucsal.viaja.domain;

import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Usuário final: pesquisa, monta itinerários, solicita reservas e avalia. */
@Entity
@DiscriminatorValue("VIAJANTE")
@Getter
@Setter
@NoArgsConstructor
public class Viajante extends Usuario {

    @Convert(converter = ListaTextoConverter.class)
    @Column(length = 500)
    private List<String> interesses = new ArrayList<>();

    @Override
    public Perfil getPerfil() {
        return Perfil.VIAJANTE;
    }
}
