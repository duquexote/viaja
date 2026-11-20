package br.ucsal.viaja.dto;

import java.time.LocalDateTime;

import br.ucsal.viaja.domain.Notificacao;
import br.ucsal.viaja.domain.TipoNotificacao;

public record NotificacaoDTO(Long id, TipoNotificacao tipo, String mensagem, boolean lida, LocalDateTime criadaEm) {

    public static NotificacaoDTO de(Notificacao n) {
        return new NotificacaoDTO(n.getId(), n.getTipo(), n.getMensagem(), n.isLida(), n.getCriadaEm());
    }
}
