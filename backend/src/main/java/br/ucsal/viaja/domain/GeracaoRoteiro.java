package br.ucsal.viaja.domain;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Registro de cada roteiro gerado pelo assistente, usado para o limite diário por usuário (RN-09). */
@Entity
@Table(name = "geracoes_roteiro")
@Getter
@Setter
@NoArgsConstructor
public class GeracaoRoteiro {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long usuarioId;

    @Column(nullable = false)
    private LocalDateTime criadaEm = LocalDateTime.now();

    /** "IA" ou "PADRAO". */
    @Column(length = 10)
    private String fonte;

    public GeracaoRoteiro(Long usuarioId, String fonte) {
        this.usuarioId = usuarioId;
        this.fonte = fonte;
    }
}
