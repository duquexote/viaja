package br.ucsal.viaja.domain;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.DiscriminatorColumn;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Inheritance;
import jakarta.persistence.InheritanceType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Centro do modelo: itinerários, reservas e avaliações apontam para uma Oferta.
 * Classe abstrata herdada por Passagem, Hospedagem e Passeio. Todos os preços em Reais (RN-05).
 */
@Entity
@Table(name = "ofertas")
@Inheritance(strategy = InheritanceType.SINGLE_TABLE)
@DiscriminatorColumn(name = "tipo_oferta", length = 20)
@Getter
@Setter
@NoArgsConstructor
public abstract class Oferta {

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "oferta_seq")
    @SequenceGenerator(name = "oferta_seq", sequenceName = "oferta_seq", allocationSize = 50)
    private Long id;

    @Column(nullable = false, length = 160)
    private String titulo;

    @Column(length = 2000)
    private String descricao;

    @Column(nullable = false, length = 80)
    private String cidade;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal preco;

    private int vagas;

    private boolean ativa = true;

    @Column(length = 500)
    private String fotoUrl;

    private double notaMedia;

    private int totalAvaliacoes;

    private LocalDateTime criadaEm = LocalDateTime.now();

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "fornecedor_id")
    private Fornecedor fornecedor;

    public abstract TipoOferta getTipo();

    /** RN-02: não se reserva item sem vagas. */
    public boolean verificarDisponibilidade(int unidades) {
        return ativa && vagas >= unidades;
    }

    /** Quantas vagas (assentos, lugares ou quartos) um grupo consome. */
    public int unidadesPara(int pessoas) {
        return pessoas;
    }

    /** Custo para o grupo. O parâmetro noites só importa para hospedagem. */
    public BigDecimal custoPara(int pessoas, Integer noites) {
        return preco.multiply(BigDecimal.valueOf(pessoas));
    }

    public void descontarVagas(int unidades) {
        this.vagas = Math.max(0, this.vagas - unidades);
    }

    public void devolverVagas(int unidades) {
        this.vagas += unidades;
    }
}
