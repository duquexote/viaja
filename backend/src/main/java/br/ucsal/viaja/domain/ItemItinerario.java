package br.ucsal.viaja.domain;

import java.math.BigDecimal;
import java.time.LocalTime;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Uma oferta colocada em um dia e horário do itinerário. */
@Entity
@Table(name = "itens_itinerario")
@Getter
@Setter
@NoArgsConstructor
public class ItemItinerario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private int dia;

    private LocalTime horario;

    /** Só para hospedagem: quantas noites a partir do dia do item. */
    private Integer noites;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "itinerario_id")
    private Itinerario itinerario;

    // EAGER de propósito: garante a subclasse concreta (Passagem, Hospedagem ou Passeio) em vez de um proxy.
    @ManyToOne(optional = false)
    @JoinColumn(name = "oferta_id")
    private Oferta oferta;

    /** Reserva criada a partir deste item, quando o viajante solicita (RF-10). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reserva_id")
    private Reserva reserva;

    public BigDecimal custo(int pessoas) {
        return oferta.custoPara(pessoas, noites);
    }

    public boolean temReservaAtiva() {
        return reserva != null && reserva.ativa();
    }
}
