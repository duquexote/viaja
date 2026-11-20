package br.ucsal.viaja.exception;

/** Usuário autenticado sem permissão para a ação. Vira HTTP 403. */
public class AcessoNegadoException extends RuntimeException {

    public AcessoNegadoException(String mensagem) {
        super(mensagem);
    }
}
