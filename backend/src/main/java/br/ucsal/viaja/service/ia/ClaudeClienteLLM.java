package br.ucsal.viaja.service.ia;

import java.time.Duration;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.errors.AnthropicServiceException;
import com.anthropic.errors.RateLimitException;
import com.anthropic.models.messages.Message;
import com.anthropic.models.messages.MessageCreateParams;
import com.anthropic.models.messages.OutputConfig;

/**
 * Implementação do Serviço de IA com a API da Anthropic (Claude), pelo SDK oficial em Java.
 * A chave fica só aqui no back-end, vinda de variável de ambiente (RNF-05), e a chamada é limitada
 * a 15 segundos (RNF-02). Nenhum dado pessoal do viajante é enviado: só o pedido de viagem e as ofertas.
 */
@Component
public class ClaudeClienteLLM implements ClienteLLM {

    private static final Logger log = LoggerFactory.getLogger(ClaudeClienteLLM.class);

    private final AnthropicClient cliente;
    private final String modelo;
    private final int timeoutSegundos;

    public ClaudeClienteLLM(@Value("${viaja.ia.api-key:}") String apiKey,
                            @Value("${viaja.ia.modelo}") String modelo,
                            @Value("${viaja.ia.timeout-segundos:15}") int timeoutSegundos) {
        this.modelo = modelo;
        this.timeoutSegundos = timeoutSegundos;
        if (apiKey == null || apiKey.isBlank()) {
            this.cliente = null;
            log.warn("ANTHROPIC_API_KEY não definida: o assistente de roteiro vai usar o roteiro padrão (sem IA).");
        } else {
            this.cliente = AnthropicOkHttpClient.builder()
                    .apiKey(apiKey.trim())
                    .timeout(Duration.ofSeconds(timeoutSegundos))
                    .maxRetries(0)
                    .build();
        }
    }

    @Override
    public boolean disponivel() {
        return cliente != null;
    }

    @Override
    public String completar(String instrucoes, String pedido) {
        if (cliente == null) {
            throw new FalhaLLMException("Serviço de IA não configurado.", null);
        }
        MessageCreateParams parametros = MessageCreateParams.builder()
                .model(modelo)
                .maxTokens(16000L)
                .system(instrucoes)
                // Esforço baixo: a tarefa é escolher entre poucas ofertas e a resposta precisa caber em 15 s.
                .outputConfig(OutputConfig.builder().effort(OutputConfig.Effort.LOW).build())
                .addUserMessage(pedido)
                .build();
        try {
            Message resposta = CompletableFuture.supplyAsync(() -> cliente.messages().create(parametros))
                    .get(timeoutSegundos, TimeUnit.SECONDS);
            // stopDetails só vem preenchido quando o modelo recusa o pedido.
            if (resposta.stopDetails().isPresent()) {
                throw new FalhaLLMException("O modelo recusou o pedido.", null);
            }
            return resposta.content().stream()
                    .flatMap(bloco -> bloco.text().stream())
                    .map(texto -> texto.text())
                    .collect(Collectors.joining());
        } catch (TimeoutException e) {
            throw new FalhaLLMException("O modelo não respondeu em " + timeoutSegundos + " segundos.", e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new FalhaLLMException("Chamada ao modelo interrompida.", e);
        } catch (ExecutionException e) {
            throw traduzir(e.getCause());
        }
    }

    private FalhaLLMException traduzir(Throwable causa) {
        if (causa instanceof RateLimitException e) {
            return new FalhaLLMException("Limite de uso da API de IA atingido.", e);
        }
        if (causa instanceof AnthropicServiceException e) {
            return new FalhaLLMException("A API de IA devolveu erro HTTP " + e.statusCode() + ".", e);
        }
        return new FalhaLLMException("Falha de comunicação com a API de IA.", causa);
    }
}
