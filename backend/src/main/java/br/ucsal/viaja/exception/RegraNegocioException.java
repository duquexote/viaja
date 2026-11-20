package br.ucsal.viaja.exception;

/** Regra de negócio violada (RN-01 a RN-10). Vira HTTP 422. */
public class RegraNegocioException extends RuntimeException {

    public RegraNegocioException(String mensagem) {
        super(mensagem);
    }
}
