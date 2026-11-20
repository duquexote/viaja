package br.ucsal.viaja;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Teste de ponta a ponta do fluxo do BPMN (objetivo OE4), com a base de demonstração em H2:
 * o viajante busca, solicita a reserva, o fornecedor aceita e o viajante é notificado.
 * Também cobre as regras de acesso por perfil, a RN-01, a RN-10 e o assistente sem IA configurada.
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:viaja-teste;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "viaja.ia.api-key=",
        "viaja.seed.ativo=true",
        "viaja.seed.senha=senha-de-teste"
})
@AutoConfigureMockMvc
class FluxoReservaIntegrationTest {

    private static final String SENHA = "senha-de-teste";

    @Autowired
    private MockMvc mvc;

    @Autowired
    private ObjectMapper json;

    @Test
    void solicitacaoAceitaPeloFornecedorConfirmaDescontaVagasENotifica() throws Exception {
        String viajante = login("ana@viaja.com");
        String fornecedor = login("onibus@viaja.com");
        LocalDate dia = LocalDate.now().plusDays(5);

        JsonNode passagens = lerJson(mvc.perform(get("/api/ofertas/passagens")
                        .param("origem", "Salvador").param("destino", "Lençóis")
                        .param("data", dia.toString()).param("tipo", "RODOVIARIA"))
                .andExpect(status().isOk())
                .andReturn());
        assertThat(passagens).isNotEmpty();
        long ofertaId = passagens.get(0).get("id").asLong();
        int vagasAntes = passagens.get(0).get("vagas").asInt();

        JsonNode reserva = lerJson(mvc.perform(post("/api/reservas")
                        .header("Authorization", "Bearer " + viajante)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"ofertaId\":" + ofertaId + ",\"pessoas\":2}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("SOLICITADA"))
                .andReturn());
        long reservaId = reserva.get("id").asLong();

        mvc.perform(post("/api/fornecedor/reservas/" + reservaId + "/aceitar")
                        .header("Authorization", "Bearer " + fornecedor))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIRMADA"));

        mvc.perform(get("/api/ofertas/" + ofertaId))
                .andExpect(jsonPath("$.vagas").value(vagasAntes - 2));

        JsonNode notificacoes = lerJson(mvc.perform(get("/api/notificacoes")
                        .header("Authorization", "Bearer " + viajante))
                .andExpect(status().isOk())
                .andReturn());
        assertThat(notificacoes.get(0).get("tipo").asText()).isEqualTo("RESERVA_CONFIRMADA");
    }

    @Test
    void rotasSaoProtegidasPorPerfil() throws Exception {
        String viajante = login("ana@viaja.com");

        mvc.perform(get("/api/itinerarios")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/admin/indicadores").header("Authorization", "Bearer " + viajante))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/fornecedor/ofertas").header("Authorization", "Bearer " + viajante))
                .andExpect(status().isForbidden());
    }

    @Test
    void menorDeIdadeNaoCriaConta() throws Exception {
        String corpo = """
                {"nome":"Menor de Idade","email":"menor@teste.com","senha":"abc12345",
                 "dataNascimento":"%s","perfil":"VIAJANTE"}
                """.formatted(LocalDate.now().minusYears(16));

        mvc.perform(post("/api/auth/registrar").contentType(MediaType.APPLICATION_JSON).content(corpo))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.erro").value("É preciso ter 18 anos ou mais para criar uma conta."));
    }

    @Test
    void comparacaoRecusaOfertasDeTiposDiferentes() throws Exception {
        long passagem = lerJson(mvc.perform(get("/api/ofertas/passagens")).andReturn()).get(0).get("id").asLong();
        long hospedagem = lerJson(mvc.perform(get("/api/ofertas/hospedagens")).andReturn()).get(0).get("id").asLong();

        mvc.perform(get("/api/ofertas/comparar").param("ids", passagem + "," + hospedagem))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void assistenteSemIaDevolveRoteiroPadraoDentroDoOrcamento() throws Exception {
        String viajante = login("bruno@viaja.com");
        LocalDate ida = LocalDate.now().plusDays(6);
        String pedido = """
                {"origem":"Salvador","destino":"Lençóis","dataIda":"%s","dataVolta":"%s",
                 "pessoas":1,"orcamento":1500,"interesses":["Trilhas","Cachoeiras"]}
                """.formatted(ida, ida.plusDays(3));

        JsonNode roteiro = lerJson(mvc.perform(post("/api/assistente/roteiro")
                        .header("Authorization", "Bearer " + viajante)
                        .contentType(MediaType.APPLICATION_JSON).content(pedido))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fonte").value("PADRAO"))
                .andExpect(jsonPath("$.aviso").isNotEmpty())
                .andReturn());

        assertThat(roteiro.get("custoTotal").asDouble()).isLessThanOrEqualTo(1500);
        assertThat(roteiro.get("dias")).hasSize(4);
        assertThat(roteiro.get("restantesHoje").asInt()).isEqualTo(4);
    }

    private String login(String email) throws Exception {
        MvcResult resultado = mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"senha\":\"" + SENHA + "\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return lerJson(resultado).get("token").asText();
    }

    private JsonNode lerJson(MvcResult resultado) throws Exception {
        return json.readTree(resultado.getResponse().getContentAsByteArray());
    }
}
