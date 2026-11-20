package br.ucsal.viaja.exception;

/** Limite diário do assistente de IA atingido (RN-09). Vira HTTP 429. */
public class LimiteExcedidoException extends RuntimeException {

    public LimiteExcedidoException(String mensagem) {
        super(mensagem);
    }
}
