package br.ucsal.viaja.domain;

/** Eventos que geram notificação no sistema e por e-mail (RF-14). */
public enum TipoNotificacao {
    NOVA_SOLICITACAO("Nova solicitação de reserva"),
    RESERVA_CONFIRMADA("Sua reserva foi confirmada"),
    RESERVA_RECUSADA("Sua reserva foi recusada"),
    RESERVA_CANCELADA("Uma reserva foi cancelada"),
    RESERVA_EXPIRADA("Sua solicitação expirou"),
    LEMBRETE_VIAGEM("Lembrete da sua viagem"),
    FORNECEDOR_APROVADO("Seu cadastro foi aprovado"),
    FORNECEDOR_BLOQUEADO("Seu cadastro foi bloqueado");

    private final String assunto;

    TipoNotificacao(String assunto) {
        this.assunto = assunto;
    }

    public String getAssunto() {
        return assunto;
    }
}
