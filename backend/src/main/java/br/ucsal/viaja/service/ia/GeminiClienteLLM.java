package br.ucsal.viaja.service.ia;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Implementação do Serviço de IA com a API Gemini, do Google, chamada por HTTP (rota generateContent).
 *
 * A chave fica só aqui no back-end, vinda de variável de ambiente (RNF-05), e vai no cabeçalho da
 * requisição, nunca na URL. A chamada toda é limitada a 15 segundos (RNF-02): se o primeiro modelo
 * estiver sobrecarregado ou demorar, tenta o modelo reserva com o tempo que sobrou.
 * Nenhum dado pessoal do viajante é enviado: só o pedido de viagem e as ofertas.
 */
@Component
public class GeminiClienteLLM implements ClienteLLM {

    private static final Logger log = LoggerFactory.getLogger(GeminiClienteLLM.class);

    /** Com modelo reserva na fila, o primeiro modelo usa no máximo esta fração do tempo total. */
    private static final double FRACAO_DO_PRIMEIRO = 0.6;
    private static final Duration TEMPO_MINIMO_PARA_TENTAR = Duration.ofSeconds(2);

    private final String apiKey;
    private final List<String> modelos;
    private final String urlBase;
    private final Duration tempoTotal;
    private final ObjectMapper json;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    public GeminiClienteLLM(@Value("${viaja.ia.api-key:}") String apiKey,
                            @Value("${viaja.ia.modelos}") List<String> modelos,
                            @Value("${viaja.ia.url-base}") String urlBase,
                            @Value("${viaja.ia.timeout-segundos:15}") int timeoutSegundos,
                            ObjectMapper json) {
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.modelos = modelos.stream().map(String::trim).filter(m -> !m.isEmpty()).toList();
        this.urlBase = urlBase.endsWith("/") ? urlBase.substring(0, urlBase.length() - 1) : urlBase;
        this.tempoTotal = Duration.ofSeconds(timeoutSegundos);
        this.json = json;
        if (this.apiKey.isEmpty()) {
            log.warn("GEMINI_API_KEY não definida: o assistente de roteiro vai usar o roteiro padrão (sem IA).");
        }
    }

    @Override
    public boolean disponivel() {
        return !apiKey.isEmpty() && !modelos.isEmpty();
    }

    @Override
    public String completar(String instrucoes, String pedido) {
        if (!disponivel()) {
            throw new FalhaLLMException("Serviço de IA não configurado.", null);
        }
        String corpo = montarCorpo(instrucoes, pedido);
        long limite = System.nanoTime() + tempoTotal.toNanos();
        FalhaLLMException ultimaFalha = null;

        for (int i = 0; i < modelos.size(); i++) {
            Duration restante = Duration.ofNanos(limite - System.nanoTime());
            if (restante.compareTo(TEMPO_MINIMO_PARA_TENTAR) < 0) {
                break;
            }
            boolean temReserva = i < modelos.size() - 1;
            Duration prazoDoPrimeiro = Duration.ofMillis((long) (tempoTotal.toMillis() * FRACAO_DO_PRIMEIRO));
            Duration prazo = temReserva && prazoDoPrimeiro.compareTo(restante) < 0 ? prazoDoPrimeiro : restante;
            try {
                return chamar(modelos.get(i), corpo, prazo);
            } catch (FalhaLLMException e) {
                ultimaFalha = e;
                log.warn("Modelo {} não respondeu: {}", modelos.get(i), e.getMessage());
            }
        }
        throw ultimaFalha != null ? ultimaFalha
                : new FalhaLLMException("O serviço de IA não respondeu em " + tempoTotal.toSeconds() + " segundos.", null);
    }

    private String montarCorpo(String instrucoes, String pedido) {
        Map<String, Object> corpo = Map.of(
                "systemInstruction", Map.of("parts", List.of(Map.of("text", instrucoes))),
                "contents", List.of(Map.of("role", "user", "parts", List.of(Map.of("text", pedido)))),
                // responseMimeType faz o modelo devolver só o JSON, sem texto em volta.
                "generationConfig", Map.of("responseMimeType", "application/json", "maxOutputTokens", 8192));
        try {
            return json.writeValueAsString(corpo);
        } catch (IOException e) {
            throw new FalhaLLMException("Não foi possível montar o pedido para a IA.", e);
        }
    }

    private String chamar(String modelo, String corpo, Duration prazo) {
        HttpRequest requisicao = HttpRequest.newBuilder(URI.create(urlBase + "/models/" + modelo + ":generateContent"))
                .timeout(prazo)
                .header("Content-Type", "application/json")
                .header("x-goog-api-key", apiKey)
                .POST(HttpRequest.BodyPublishers.ofString(corpo, StandardCharsets.UTF_8))
                .build();

        HttpResponse<String> resposta;
        try {
            resposta = http.send(requisicao, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        } catch (HttpTimeoutException e) {
            throw new FalhaLLMException("sem resposta em " + prazo.toSeconds() + " segundos.", e);
        } catch (IOException e) {
            throw new FalhaLLMException("falha de comunicação com a API de IA.", e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new FalhaLLMException("chamada interrompida.", e);
        }

        JsonNode raiz = lerJson(resposta.body());
        if (resposta.statusCode() != 200) {
            String detalhe = raiz.path("error").path("status").asText("");
            throw new FalhaLLMException("erro HTTP " + resposta.statusCode() + (detalhe.isEmpty() ? "" : " (" + detalhe + ")")
                    + ".", null);
        }

        JsonNode candidato = raiz.path("candidates").path(0);
        StringBuilder texto = new StringBuilder();
        for (JsonNode parte : candidato.path("content").path("parts")) {
            // Partes marcadas como "thought" são o raciocínio do modelo, não a resposta.
            if (!parte.path("thought").asBoolean(false)) {
                texto.append(parte.path("text").asText(""));
            }
        }
        if (texto.isEmpty()) {
            String motivo = candidato.path("finishReason").asText(raiz.path("promptFeedback").path("blockReason").asText("?"));
            throw new FalhaLLMException("o modelo não devolveu texto (motivo: " + motivo + ").", null);
        }
        return texto.toString();
    }

    private JsonNode lerJson(String corpo) {
        try {
            return json.readTree(corpo == null ? "" : corpo);
        } catch (IOException e) {
            return json.createObjectNode();
        }
    }
}
