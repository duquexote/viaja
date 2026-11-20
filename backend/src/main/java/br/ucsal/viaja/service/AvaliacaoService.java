package br.ucsal.viaja.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.ucsal.viaja.domain.Avaliacao;
import br.ucsal.viaja.domain.Oferta;
import br.ucsal.viaja.domain.Reserva;
import br.ucsal.viaja.domain.StatusReserva;
import br.ucsal.viaja.dto.AvaliacaoDTO;
import br.ucsal.viaja.dto.Requisicoes.AvaliacaoForm;
import br.ucsal.viaja.exception.NaoEncontradoException;
import br.ucsal.viaja.exception.RegraNegocioException;
import br.ucsal.viaja.repository.AvaliacaoRepository;
import br.ucsal.viaja.repository.ReservaRepository;
import lombok.RequiredArgsConstructor;

/** Avaliação de itens já usufruídos (RF-13) e a moderação feita pelo administrador (RF-15). */
@Service
@RequiredArgsConstructor
@Transactional
public class AvaliacaoService {

    private final AvaliacaoRepository avaliacoes;
    private final ReservaRepository reservas;

    /** RN-04: só avalia reserva confirmada cuja data de término já passou, e uma única vez. */
    public AvaliacaoDTO avaliar(Long viajanteId, Long reservaId, AvaliacaoForm form) {
        Reserva reserva = reservas.findById(reservaId)
                .filter(r -> r.getViajante().getId().equals(viajanteId))
                .orElseThrow(() -> new NaoEncontradoException("Reserva não encontrada."));
        if (reserva.isAvaliada()) {
            throw new RegraNegocioException("Esta reserva já foi avaliada.");
        }
        if (reserva.getStatus() != StatusReserva.CONFIRMADA) {
            throw new RegraNegocioException("Só é possível avaliar reservas confirmadas.");
        }
        if (!reserva.podeAvaliar(LocalDateTime.now())) {
            throw new RegraNegocioException("Você só pode avaliar depois de usufruir do serviço.");
        }

        Avaliacao avaliacao = new Avaliacao();
        avaliacao.setNota(form.nota());
        avaliacao.setComentario(Texto.vazio(form.comentario()) ? null : form.comentario().trim());
        avaliacao.setViajante(reserva.getViajante());
        avaliacao.setOferta(reserva.getOferta());
        avaliacao.setReserva(reserva);
        avaliacoes.saveAndFlush(avaliacao);
        reserva.setAvaliada(true);
        atualizarNotaMedia(reserva.getOferta());
        return AvaliacaoDTO.de(avaliacao);
    }

    @Transactional(readOnly = true)
    public List<AvaliacaoDTO> listarDaOferta(Long ofertaId) {
        return avaliacoes.daOferta(ofertaId).stream().map(AvaliacaoDTO::de).toList();
    }

    @Transactional(readOnly = true)
    public List<AvaliacaoDTO> listarTodas() {
        return avaliacoes.todas().stream().map(AvaliacaoDTO::de).toList();
    }

    /** Remoção de avaliação abusiva pelo administrador. A reserva continua marcada como avaliada. */
    public void remover(Long avaliacaoId) {
        Avaliacao avaliacao = avaliacoes.findById(avaliacaoId)
                .orElseThrow(() -> new NaoEncontradoException("Avaliação não encontrada."));
        Oferta oferta = avaliacao.getOferta();
        avaliacoes.delete(avaliacao);
        avaliacoes.flush();
        atualizarNotaMedia(oferta);
    }

    private void atualizarNotaMedia(Oferta oferta) {
        Double media = avaliacoes.mediaDaOferta(oferta.getId());
        oferta.setNotaMedia(media == null ? 0 : Math.round(media * 10) / 10.0);
        oferta.setTotalAvaliacoes((int) avaliacoes.countByOfertaId(oferta.getId()));
    }
}
