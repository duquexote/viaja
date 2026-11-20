package br.ucsal.viaja.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Comparator;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonFormat;

import br.ucsal.viaja.domain.ItemItinerario;
import br.ucsal.viaja.domain.Itinerario;
import br.ucsal.viaja.domain.StatusReserva;

/** Itinerário com os itens por dia, o custo total e os conflitos encontrados na validação (RF-08). */
public record ItinerarioDTO(
        Long id,
        String nome,
        LocalDate dataInicio,
        LocalDate dataFim,
        int totalDias,
        int pessoas,
        BigDecimal custoTotal,
        boolean geradoPorIA,
        List<Item> itens,
        List<String> conflitos,
        boolean podeSolicitar) {

    public record Item(
            Long id,
            int dia,
            LocalDate data,
            @JsonFormat(pattern = "HH:mm") LocalTime horario,
            Integer noites,
            BigDecimal custo,
            OfertaDTO oferta,
            Long reservaId,
            StatusReserva reservaStatus) {
    }

    public static ItinerarioDTO de(Itinerario it, List<String> conflitos) {
        List<Item> itens = it.getItens().stream()
                .sorted(Comparator.comparingInt(ItemItinerario::getDia)
                        .thenComparing(ItemItinerario::getHorario, Comparator.nullsLast(Comparator.naturalOrder())))
                .map(item -> new Item(
                        item.getId(),
                        item.getDia(),
                        it.dataDoDia(item.getDia()),
                        item.getHorario(),
                        item.getNoites(),
                        item.custo(it.getPessoas()),
                        OfertaDTO.de(item.getOferta()),
                        item.getReserva() == null ? null : item.getReserva().getId(),
                        item.getReserva() == null ? null : item.getReserva().getStatus()))
                .toList();
        boolean temItemSemReserva = it.getItens().stream().anyMatch(item -> !item.temReservaAtiva());
        return new ItinerarioDTO(
                it.getId(), it.getNome(), it.getDataInicio(), it.getDataFim(), it.totalDias(), it.getPessoas(),
                it.getCustoTotal(), it.isGeradoPorIA(), itens, conflitos,
                conflitos.isEmpty() && temItemSemReserva);
    }
}
