package br.ucsal.viaja.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import br.ucsal.viaja.domain.Reserva;
import br.ucsal.viaja.domain.StatusReserva;

public record ReservaDTO(
        Long id,
        StatusReserva status,
        LocalDateTime dataSolicitacao,
        LocalDateTime dataResposta,
        LocalDateTime expiraEm,
        int pessoas,
        int quantidade,
        Integer noites,
        LocalDateTime dataInicio,
        LocalDateTime dataFim,
        BigDecimal valorTotal,
        String motivo,
        OfertaDTO oferta,
        Long viajanteId,
        String viajanteNome,
        boolean podeCancelar,
        boolean podeAvaliar,
        boolean avaliada) {

    public static ReservaDTO de(Reserva r) {
        LocalDateTime agora = LocalDateTime.now();
        return new ReservaDTO(
                r.getId(), r.getStatus(), r.getDataSolicitacao(), r.getDataResposta(), r.expiraEm(),
                r.getPessoas(), r.getQuantidade(), r.getNoites(), r.getDataInicio(), r.getDataFim(),
                r.getValorTotal(), r.getMotivo(), OfertaDTO.de(r.getOferta()),
                r.getViajante().getId(), r.getViajante().getNome(),
                r.podeCancelar(agora), r.podeAvaliar(agora), r.isAvaliada());
    }
}
