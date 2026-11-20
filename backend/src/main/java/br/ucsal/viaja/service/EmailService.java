package br.ucsal.viaja.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/**
 * Envio de e-mail transacional (RF-14). Com SMTP configurado (spring.mail.host) envia de verdade;
 * sem SMTP, apenas registra a mensagem no log, o que basta para demonstrar o fluxo.
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender remetenteSmtp;
    private final String remetente;

    public EmailService(ObjectProvider<JavaMailSender> remetenteSmtp,
                        @Value("${viaja.email.remetente}") String remetente) {
        this.remetenteSmtp = remetenteSmtp.getIfAvailable();
        this.remetente = remetente;
    }

    public boolean envioRealConfigurado() {
        return remetenteSmtp != null;
    }

    /** Falha de e-mail nunca derruba a operação principal: é registrada e segue. */
    public void enviar(String para, String assunto, String texto) {
        if (remetenteSmtp == null) {
            log.info("[e-mail simulado] para: {} | assunto: {} | {}", para, assunto, texto);
            return;
        }
        try {
            SimpleMailMessage mensagem = new SimpleMailMessage();
            mensagem.setFrom(remetente);
            mensagem.setTo(para);
            mensagem.setSubject("ViaJá: " + assunto);
            mensagem.setText(texto);
            remetenteSmtp.send(mensagem);
        } catch (RuntimeException e) {
            log.warn("Não foi possível enviar e-mail para {}: {}", para, e.getMessage());
        }
    }
}
