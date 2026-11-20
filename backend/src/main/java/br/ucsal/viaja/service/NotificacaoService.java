package br.ucsal.viaja.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.ucsal.viaja.domain.Notificacao;
import br.ucsal.viaja.domain.TipoNotificacao;
import br.ucsal.viaja.domain.Usuario;
import br.ucsal.viaja.dto.NotificacaoDTO;
import br.ucsal.viaja.exception.NaoEncontradoException;
import br.ucsal.viaja.repository.NotificacaoRepository;
import lombok.RequiredArgsConstructor;

/** Notificações dentro do sistema e por e-mail sobre mudanças de status da reserva (RF-14). */
@Service
@RequiredArgsConstructor
@Transactional
public class NotificacaoService {

    private final NotificacaoRepository notificacoes;
    private final EmailService email;

    /** Um único ponto de envio: grava o aviso no sistema e dispara o e-mail correspondente. */
    public void notificar(Usuario destinatario, TipoNotificacao tipo, String mensagem) {
        notificacoes.save(new Notificacao(destinatario, tipo, mensagem));
        email.enviar(destinatario.getEmail(), tipo.getAssunto(), mensagem);
    }

    @Transactional(readOnly = true)
    public List<NotificacaoDTO> listar(Long usuarioId) {
        return notificacoes.findTop50ByUsuarioIdOrderByCriadaEmDescIdDesc(usuarioId).stream()
                .map(NotificacaoDTO::de)
                .toList();
    }

    @Transactional(readOnly = true)
    public long contarNaoLidas(Long usuarioId) {
        return notificacoes.countByUsuarioIdAndLidaFalse(usuarioId);
    }

    public void marcarComoLida(Long usuarioId, Long notificacaoId) {
        Notificacao notificacao = notificacoes.findByIdAndUsuarioId(notificacaoId, usuarioId)
                .orElseThrow(() -> new NaoEncontradoException("Notificação não encontrada."));
        notificacao.marcarComoLida();
    }

    public void marcarTodasComoLidas(Long usuarioId) {
        notificacoes.marcarTodasComoLidas(usuarioId);
    }
}
