package br.ucsal.viaja.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonFormat;

import br.ucsal.viaja.domain.Hospedagem;
import br.ucsal.viaja.domain.Oferta;
import br.ucsal.viaja.domain.Passagem;
import br.ucsal.viaja.domain.Passeio;
import br.ucsal.viaja.domain.TipoHospedagem;
import br.ucsal.viaja.domain.TipoOferta;
import br.ucsal.viaja.domain.TipoTransporte;

/** Formato único para os três tipos de oferta; campos que não pertencem ao tipo vêm nulos. */
public record OfertaDTO(
        Long id,
        TipoOferta tipo,
        String titulo,
        String descricao,
        String cidade,
        BigDecimal preco,
        int vagas,
        boolean ativa,
        String fotoUrl,
        Long fornecedorId,
        String fornecedorNome,
        double notaMedia,
        int totalAvaliacoes,
        // passagem
        String origem,
        String destino,
        TipoTransporte tipoTransporte,
        LocalDateTime partida,
        LocalDateTime chegada,
        Long duracaoMinutos,
        // hospedagem
        TipoHospedagem tipoHospedagem,
        List<String> comodidades,
        Integer capacidade,
        // passeio
        String categoria,
        LocalDate data,
        @JsonFormat(pattern = "HH:mm") LocalTime horarioInicio,
        Integer duracaoHoras) {

    public static OfertaDTO de(Oferta o) {
        Passagem passagem = o instanceof Passagem p ? p : null;
        Hospedagem hospedagem = o instanceof Hospedagem h ? h : null;
        Passeio passeio = o instanceof Passeio p ? p : null;
        return new OfertaDTO(
                o.getId(), o.getTipo(), o.getTitulo(), o.getDescricao(), o.getCidade(), o.getPreco(),
                o.getVagas(), o.isAtiva(), o.getFotoUrl(),
                o.getFornecedor().getId(), o.getFornecedor().nomeExibicao(),
                o.getNotaMedia(), o.getTotalAvaliacoes(),
                passagem == null ? null : passagem.getOrigem(),
                passagem == null ? null : passagem.getDestino(),
                passagem == null ? null : passagem.getTipoTransporte(),
                passagem == null ? null : passagem.getPartida(),
                passagem == null ? null : passagem.getChegada(),
                passagem == null ? null : passagem.duracaoMinutos(),
                hospedagem == null ? null : hospedagem.getTipoHospedagem(),
                hospedagem == null ? null : List.copyOf(hospedagem.getComodidades()),
                hospedagem == null ? null : hospedagem.getCapacidade(),
                passeio == null ? null : passeio.getCategoria(),
                passeio == null ? null : passeio.getData(),
                passeio == null ? null : passeio.getHorarioInicio(),
                passeio == null ? null : passeio.getDuracaoHoras());
    }
}
