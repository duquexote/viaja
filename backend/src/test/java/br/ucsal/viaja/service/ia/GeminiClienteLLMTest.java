package br.ucsal.viaja.service.ia;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;

import br.ucsal.viaja.service.ia.ClienteLLM.FalhaLLMException;

/** Testa o cliente do Gemini contra um servidor HTTP falso, sem usar a internet nem uma chave real. */
class GeminiClienteLLMTest {

    private static final String RESPOSTA_OK = """
            {"candidates":[{"content":{"parts":[{"text":"pensando","thought":true},{"text":"{\\"dias\\":[]}"}]},
             "finishReason":"STOP"}]}
            """;

    private HttpServer servidor;
    private final List<String> chamadas = new CopyOnWriteArrayList<>();

    @BeforeEach
    void subirServidor() throws IOException {
        servidor = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        servidor.start();
    }

    @AfterEach
    void pararServidor() {
        servidor.stop(0);
    }

    @Test
    void devolveOTextoDaRespostaEMandaAChaveNoCabecalho() {
        responder("modelo-a", 200, RESPOSTA_OK);

        String texto = cliente("chave-de-teste", "modelo-a").completar("instruções", "pedido");

        assertThat(texto).isEqualTo("{\"dias\":[]}");
        assertThat(chamadas).containsExactly("modelo-a|chave=chave-de-teste|query=null");
    }

    @Test
    void modeloSobrecarregadoCaiParaOModeloReserva() {
        responder("modelo-a", 503, "{\"error\":{\"status\":\"UNAVAILABLE\",\"message\":\"sobrecarregado\"}}");
        responder("modelo-b", 200, RESPOSTA_OK);

        String texto = cliente("chave-de-teste", "modelo-a", "modelo-b").completar("instruções", "pedido");

        assertThat(texto).isEqualTo("{\"dias\":[]}");
        assertThat(chamadas).hasSize(2);
        assertThat(chamadas.get(1)).startsWith("modelo-b|");
    }

    @Test
    void respostaSemTextoViraFalha() {
        responder("modelo-a", 200, "{\"candidates\":[{\"finishReason\":\"SAFETY\"}]}");

        assertThatThrownBy(() -> cliente("chave-de-teste", "modelo-a").completar("instruções", "pedido"))
                .isInstanceOf(FalhaLLMException.class)
                .hasMessageContaining("SAFETY");
    }

    @Test
    void semChaveOServicoNaoEstaDisponivel() {
        assertThat(cliente("", "modelo-a").disponivel()).isFalse();
        assertThat(cliente("chave-de-teste", "modelo-a").disponivel()).isTrue();
    }

    private GeminiClienteLLM cliente(String chave, String... modelos) {
        String urlBase = "http://127.0.0.1:" + servidor.getAddress().getPort() + "/v1beta";
        return new GeminiClienteLLM(chave, List.of(modelos), urlBase, 5, new ObjectMapper());
    }

    private void responder(String modelo, int status, String corpo) {
        servidor.createContext("/v1beta/models/" + modelo + ":generateContent", troca -> {
            chamadas.add(modelo + "|chave=" + troca.getRequestHeaders().getFirst("x-goog-api-key")
                    + "|query=" + troca.getRequestURI().getQuery());
            byte[] bytes = corpo.getBytes(StandardCharsets.UTF_8);
            troca.getResponseHeaders().add("Content-Type", "application/json");
            troca.sendResponseHeaders(status, bytes.length);
            try (var saida = troca.getResponseBody()) {
                saida.write(bytes);
            }
        });
    }
}
