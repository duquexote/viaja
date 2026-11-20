package br.ucsal.viaja.web;

import java.util.LinkedHashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import com.fasterxml.jackson.annotation.JsonInclude;

import br.ucsal.viaja.exception.AcessoNegadoException;
import br.ucsal.viaja.exception.CredenciaisInvalidasException;
import br.ucsal.viaja.exception.LimiteExcedidoException;
import br.ucsal.viaja.exception.NaoEncontradoException;
import br.ucsal.viaja.exception.RegraNegocioException;

/** Converte exceções no formato único de erro da API: { "erro": "...", "campos": { ... } }. */
@RestControllerAdvice
public class ApiExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    public record Erro(String erro, @JsonInclude(JsonInclude.Include.NON_NULL) Map<String, String> campos) {
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Erro> validacao(MethodArgumentNotValidException e) {
        Map<String, String> campos = new LinkedHashMap<>();
        e.getBindingResult().getFieldErrors()
                .forEach(f -> campos.putIfAbsent(f.getField(), f.getDefaultMessage()));
        String resumo = campos.isEmpty() ? "Dados inválidos." : campos.values().iterator().next();
        return responder(HttpStatus.BAD_REQUEST, resumo, campos);
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class})
    public ResponseEntity<Erro> requisicaoMalFormada(Exception e) {
        return responder(HttpStatus.BAD_REQUEST, "Requisição inválida: confira os campos e os formatos de data.", null);
    }

    @ExceptionHandler(RegraNegocioException.class)
    public ResponseEntity<Erro> regraDeNegocio(RegraNegocioException e) {
        return responder(HttpStatus.UNPROCESSABLE_ENTITY, e.getMessage(), null);
    }

    @ExceptionHandler(NaoEncontradoException.class)
    public ResponseEntity<Erro> naoEncontrado(NaoEncontradoException e) {
        return responder(HttpStatus.NOT_FOUND, e.getMessage(), null);
    }

    @ExceptionHandler(AcessoNegadoException.class)
    public ResponseEntity<Erro> acessoNegado(AcessoNegadoException e) {
        return responder(HttpStatus.FORBIDDEN, e.getMessage(), null);
    }

    @ExceptionHandler(CredenciaisInvalidasException.class)
    public ResponseEntity<Erro> credenciais(CredenciaisInvalidasException e) {
        return responder(HttpStatus.UNAUTHORIZED, e.getMessage(), null);
    }

    @ExceptionHandler(LimiteExcedidoException.class)
    public ResponseEntity<Erro> limite(LimiteExcedidoException e) {
        return responder(HttpStatus.TOO_MANY_REQUESTS, e.getMessage(), null);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Erro> integridade(DataIntegrityViolationException e) {
        return responder(HttpStatus.UNPROCESSABLE_ENTITY, "Operação não permitida: dado duplicado ou em uso.", null);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Erro> inesperado(Exception e) {
        // Erros do próprio Spring MVC (rota inexistente, método não suportado) mantêm o status original.
        if (e instanceof ErrorResponse resposta) {
            return ResponseEntity.status(resposta.getStatusCode()).body(new Erro("Requisição inválida.", null));
        }
        log.error("Erro inesperado na API", e);
        return responder(HttpStatus.INTERNAL_SERVER_ERROR, "Erro interno. Tente novamente em instantes.", null);
    }

    private static ResponseEntity<Erro> responder(HttpStatus status, String mensagem, Map<String, String> campos) {
        return ResponseEntity.status(status).body(new Erro(mensagem, campos == null || campos.isEmpty() ? null : campos));
    }
}
