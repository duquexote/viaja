package br.ucsal.viaja.domain;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Hotel, pousada, hostel ou casa. O preço é a diária por quarto e as vagas são quartos. */
@Entity
@DiscriminatorValue("HOSPEDAGEM")
@Getter
@Setter
@NoArgsConstructor
public class Hospedagem extends Oferta {

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private TipoHospedagem tipoHospedagem;

    @Convert(converter = ListaTextoConverter.class)
    @Column(length = 500)
    private List<String> comodidades = new ArrayList<>();

    /** Hóspedes por quarto. */
    private Integer capacidade;

    @Override
    public TipoOferta getTipo() {
        return TipoOferta.HOSPEDAGEM;
    }

    /** Quartos necessários para acomodar o grupo. */
    @Override
    public int unidadesPara(int pessoas) {
        int porQuarto = capacidade == null || capacidade < 1 ? 1 : capacidade;
        return (int) Math.ceil(pessoas / (double) porQuarto);
    }

    @Override
    public BigDecimal custoPara(int pessoas, Integer noites) {
        int totalNoites = noites == null || noites < 1 ? 1 : noites;
        return getPreco().multiply(BigDecimal.valueOf((long) unidadesPara(pessoas) * totalNoites));
    }
}
