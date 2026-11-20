package br.ucsal.viaja.exception;

/** Recurso inexistente ou que não pertence ao usuário. Vira HTTP 404. */
public class NaoEncontradoException extends RuntimeException {

    public NaoEncontradoException(String mensagem) {
        super(mensagem);
    }
}
