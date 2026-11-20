package br.ucsal.viaja.domain;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;

import jakarta.persistence.Column;
import jakarta.persistence.DiscriminatorColumn;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Inheritance;
import jakarta.persistence.InheritanceType;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Usuário do sistema. Classe abstrata especializada em Viajante, Fornecedor e Administrador
 * (diagrama de classes, seção 8). Os três ficam na mesma tabela, diferenciados pela coluna "perfil".
 */
@Entity
@Table(name = "usuarios")
@Inheritance(strategy = InheritanceType.SINGLE_TABLE)
@DiscriminatorColumn(name = "perfil", length = 20)
@Getter
@Setter
@NoArgsConstructor
public abstract class Usuario {

    public static final int IDADE_MINIMA = 18;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String nome;

    @Column(nullable = false, unique = true, length = 160)
    private String email;

    /** Hash bcrypt da senha (RNF-03). A senha em texto puro nunca é guardada. */
    @Column(nullable = false)
    private String senhaHash;

    private LocalDate dataNascimento;

    private boolean emailConfirmado;

    private String tokenConfirmacao;

    /** Falso depois que o usuário exclui a própria conta (RF-02, LGPD). */
    private boolean ativo = true;

    private LocalDateTime criadoEm = LocalDateTime.now();

    public abstract Perfil getPerfil();

    /** RN-01: só maiores de 18 anos criam conta e solicitam reservas. */
    public boolean maiorDeIdade(LocalDate hoje) {
        return dataNascimento != null && Period.between(dataNascimento, hoje).getYears() >= IDADE_MINIMA;
    }
}
