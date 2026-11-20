package br.ucsal.viaja.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonFormat;

/**
 * Sugestão de roteiro devolvida pelo assistente (RF-09). Ainda não está salva:
 * o viajante edita e depois grava como um itinerário normal.
 */
public record RoteiroDTO(
        String origem,
        String destino,
        LocalDate dataInicio,
        LocalDate dataFim,
        int pessoas,
        BigDecimal orcamento,
        BigDecimal custoTotal,
        String observacoes,
        /** "IA" quando veio do modelo de linguagem, "PADRAO" quando foi montado por regra (RNF-02). */
        String fonte,
        String aviso,
        int restantesHoje,
        List<Dia> dias) {

    public record Dia(int dia, LocalDate data, List<Item> itens) {
    }

    public record Item(
            Long ofertaId,
            @JsonFormat(pattern = "HH:mm") LocalTime horario,
            Integer noites,
            String motivo,
            BigDecimal custo,
            OfertaDTO oferta) {
    }
}
