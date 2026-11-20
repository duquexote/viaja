package br.ucsal.viaja.domain;

import java.time.Duration;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Trecho de passagem aérea ou rodoviária, com data e hora fixas. O preço é por passageiro. */
@Entity
@DiscriminatorValue("PASSAGEM")
@Getter
@Setter
@NoArgsConstructor
public class Passagem extends Oferta {

    @Column(length = 80)
    private String origem;

    @Column(length = 80)
    private String destino;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private TipoTransporte tipoTransporte;

    private LocalDateTime partida;

    private LocalDateTime chegada;

    @Override
    public TipoOferta getTipo() {
        return TipoOferta.PASSAGEM;
    }

    public long duracaoMinutos() {
        return Duration.between(partida, chegada).toMinutes();
    }
}
