package br.ucsal.viaja.domain;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Roteiro de viagem organizado por dia (RF-08). É composto por itens:
 * apagar o itinerário apaga os itens junto (composição no diagrama de classes).
 */
@Entity
@Table(name = "itinerarios")
@Getter
@Setter
@NoArgsConstructor
public class Itinerario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String nome;

    @Column(nullable = false)
    private LocalDate dataInicio;

    @Column(nullable = false)
    private LocalDate dataFim;

    private int pessoas = 1;

    @Column(precision = 12, scale = 2)
    private BigDecimal custoTotal = BigDecimal.ZERO;

    private boolean geradoPorIA;

    private LocalDateTime criadoEm = LocalDateTime.now();

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "viajante_id")
    private Viajante viajante;

    @OneToMany(mappedBy = "itinerario", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("dia ASC, horario ASC")
    private List<ItemItinerario> itens = new ArrayList<>();

    public void adicionarItem(ItemItinerario item) {
        item.setItinerario(this);
        itens.add(item);
    }

    public void removerItem(ItemItinerario item) {
        itens.remove(item);
    }

    public int totalDias() {
        return (int) ChronoUnit.DAYS.between(dataInicio, dataFim) + 1;
    }

    /** Data do calendário correspondente a um dia do roteiro (o dia 1 é a data de início). */
    public LocalDate dataDoDia(int dia) {
        return dataInicio.plusDays(dia - 1L);
    }

    /** Dia do roteiro correspondente a uma data (pode cair fora do período). */
    public int diaDaData(LocalDate data) {
        return (int) ChronoUnit.DAYS.between(dataInicio, data) + 1;
    }

    public void recalcularCusto() {
        this.custoTotal = itens.stream()
                .map(item -> item.custo(pessoas))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
