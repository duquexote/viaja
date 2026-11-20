package br.ucsal.viaja.dto;

import java.time.LocalDate;

import br.ucsal.viaja.domain.Avaliacao;

public record AvaliacaoDTO(
        Long id,
        int nota,
        String comentario,
        LocalDate data,
        String viajanteNome,
        Long ofertaId,
        String ofertaTitulo) {

    public static AvaliacaoDTO de(Avaliacao a) {
        return new AvaliacaoDTO(a.getId(), a.getNota(), a.getComentario(), a.getData(),
                a.getViajante().getNome(), a.getOferta().getId(), a.getOferta().getTitulo());
    }
}
