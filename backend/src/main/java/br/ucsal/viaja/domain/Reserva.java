package br.ucsal.viaja.domain;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import br.ucsal.viaja.exception.RegraNegocioException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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

/**
 * Solicitação de reserva sem pagamento (RF-10). O status hoje vai de SOLICITADA para CONFIRMADA;
 * no futuro pode ganhar um passo "aguardando pagamento" sem refazer o fluxo (seção 1.3).
 */
@Entity
@Table(name = "reservas")
@Getter
@Setter
@NoArgsConstructor
public class Reserva {

    /** RN-07: solicitação sem resposta expira em 48 horas. */
    public static final int HORAS_PARA_EXPIRAR = 48;

    /** RN-03: cancelamento só até 48 horas antes do início. */
    public static final int HORAS_MINIMAS_CANCELAMENTO = 48;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "viajante_id")
    private Viajante viajante;

    @ManyToOne(optional = false)
    @JoinColumn(name = "oferta_id")
    private Oferta oferta;

    @Column(nullable = false)
    private LocalDateTime dataSolicitacao = LocalDateTime.now();

    private LocalDateTime dataResposta;

    private int pessoas;

    /** Vagas consumidas: assentos, lugares no passeio ou quartos. */
    private int quantidade;

    private Integer noites;

    /** Embarque, check-in ou início do passeio. */
    @Column(nullable = false)
    private LocalDateTime dataInicio;

    @Column(nullable = false)
    private LocalDateTime dataFim;

    @Column(precision = 12, scale = 2)
    private BigDecimal valorTotal;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatusReserva status = StatusReserva.SOLICITADA;

    @Column(length = 500)
    private String motivo;

    private boolean avaliada;

    private boolean lembreteEnviado;

    public boolean ativa() {
        return status == StatusReserva.SOLICITADA || status == StatusReserva.CONFIRMADA;
    }

    public LocalDateTime expiraEm() {
        return dataSolicitacao.plusHours(HORAS_PARA_EXPIRAR);
    }

    public boolean podeCancelar(LocalDateTime agora) {
        return ativa() && !agora.isAfter(dataInicio.minusHours(HORAS_MINIMAS_CANCELAMENTO));
    }

    /** RN-04: só avalia reserva confirmada cuja data de término já passou. */
    public boolean podeAvaliar(LocalDateTime agora) {
        return status == StatusReserva.CONFIRMADA && dataFim.isBefore(agora) && !avaliada;
    }

    /** RN-02: o aceite do fornecedor desconta as vagas. */
    public void confirmar() {
        exigirSolicitada();
        if (!oferta.verificarDisponibilidade(quantidade)) {
            throw new RegraNegocioException("Não há vagas suficientes para confirmar esta reserva (restam "
                    + oferta.getVagas() + ").");
        }
        oferta.descontarVagas(quantidade);
        status = StatusReserva.CONFIRMADA;
        dataResposta = LocalDateTime.now();
    }

    public void recusar(String motivoInformado) {
        exigirSolicitada();
        status = StatusReserva.RECUSADA;
        motivo = motivoInformado == null || motivoInformado.isBlank() ? null : motivoInformado.trim();
        dataResposta = LocalDateTime.now();
    }

    public void expirar() {
        exigirSolicitada();
        status = StatusReserva.EXPIRADA;
        dataResposta = LocalDateTime.now();
    }

    /** RN-03: cancelamento sem reembolso; se já estava confirmada, as vagas voltam para a oferta. */
    public void cancelar(LocalDateTime agora) {
        if (!ativa()) {
            throw new RegraNegocioException("Esta reserva não pode mais ser cancelada.");
        }
        if (!podeCancelar(agora)) {
            throw new RegraNegocioException("O cancelamento só pode ser feito até "
                    + HORAS_MINIMAS_CANCELAMENTO + " horas antes do início.");
        }
        if (status == StatusReserva.CONFIRMADA) {
            oferta.devolverVagas(quantidade);
        }
        status = StatusReserva.CANCELADA;
        dataResposta = agora;
    }

    private void exigirSolicitada() {
        if (status != StatusReserva.SOLICITADA) {
            throw new RegraNegocioException("Esta solicitação já foi respondida ou encerrada.");
        }
    }
}
