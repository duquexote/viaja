package br.ucsal.viaja.domain;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import jakarta.persistence.Column;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Passeio local em uma data fixa. O preço é por pessoa. */
@Entity
@DiscriminatorValue("PASSEIO")
@Getter
@Setter
@NoArgsConstructor
public class Passeio extends Oferta {

    @Column(length = 60)
    private String categoria;

    @Column(name = "data_passeio")
    private LocalDate data;

    private LocalTime horarioInicio;

    private Integer duracaoHoras;

    @Override
    public TipoOferta getTipo() {
        return TipoOferta.PASSEIO;
    }

    public LocalDateTime inicio() {
        return data.atTime(horarioInicio == null ? LocalTime.of(8, 0) : horarioInicio);
    }

    public LocalDateTime fim() {
        return inicio().plusHours(duracaoHoras == null ? 1 : duracaoHoras);
    }
}
