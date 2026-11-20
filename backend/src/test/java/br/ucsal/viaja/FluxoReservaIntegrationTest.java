package br.ucsal.viaja;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import br.ucsal.viaja.service.ia.ClienteLLM;

/**
 * Teste de ponta a ponta do fluxo do BPMN (objetivo OE4), com a base de demonstração em H2:
 * o viajante busca, solicita a reserva, o fornecedor aceita e o viajante é notificado.
 * Também cobre as regras de acesso por perfil, a RN-01, a RN-10 e o assistente de roteiro,
 * com o serviço de IA substituído por um dublê (os testes não chamam a API externa).
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:viaja-teste;DB_CLOSE_DELAY=-1",
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

    /** Dublê do serviço de IA: por padrão responde que não está disponível. */
    @MockitoBean
    private ClienteLLM llm;

    @Test
    void assistenteComIaSoAceitaOfertasCadastradas() throws Exception {
        String viajante = login("carla@viaja.com");
        LocalDate ida = LocalDate.now().plusDays(7);
        long passagem = primeiroId(get("/api/ofertas/passagens").param("origem", "Salvador")
                .param("destino", "Lençóis").param("data", ida.toString()));
        long hospedagem = primeiroId(get("/api/ofertas/hospedagens").param("cidade", "Lençóis"));
        long passeio = primeiroId(get("/api/ofertas/passeios").param("cidade", "Lençóis")
                .param("data", ida.plusDays(2).toString()));

        // A "IA" escolhe três ofertas reais e inventa uma quarta, que não existe no banco (RN-09).
        when(llm.disponivel()).thenReturn(true);
        when(llm.completar(anyString(), anyString())).thenReturn("""
                {"dias":[
                  {"data":"%s","itens":[{"ofertaId":%d,"horario":"07:00","motivo":"Ida."},
                                        {"ofertaId":%d,"horario":"14:00","motivo":"Bem avaliada."}]},
                  {"data":"%s","itens":[{"ofertaId":%d,"horario":"08:00","motivo":"Trilha."},
                                        {"ofertaId":987654321,"horario":"20:00","motivo":"Inventada."}]}],
                 "custoTotal":1,"observacoes":"Roteiro de teste."}
                """.formatted(ida, passagem, hospedagem, ida.plusDays(2), passeio));

        String pedido = """
                {"origem":"Salvador","destino":"Lençóis","dataIda":"%s","dataVolta":"%s",
                 "pessoas":1,"orcamento":3000,"interesses":["Trilhas"]}
                """.formatted(ida, ida.plusDays(3));
        JsonNode roteiro = lerJson(mvc.perform(post("/api/assistente/roteiro")
                        .header("Authorization", "Bearer " + viajante)
                        .contentType(MediaType.APPLICATION_JSON).content(pedido))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fonte").value("IA"))
                .andExpect(jsonPath("$.aviso").isEmpty())
                .andExpect(jsonPath("$.observacoes").value("Roteiro de teste."))
                .andReturn());

        List<Long> escolhidas = new ArrayList<>();
        roteiro.get("dias").forEach(dia -> dia.get("itens").forEach(item -> escolhidas.add(item.get("ofertaId").asLong())));
        assertThat(escolhidas).containsExactlyInAnyOrder(passagem, hospedagem, passeio);
    }

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

    private long primeiroId(org.springframework.test.web.servlet.RequestBuilder busca) throws Exception {
        return lerJson(mvc.perform(busca).andExpect(status().isOk()).andReturn()).get(0).get("id").asLong();
    }

    private JsonNode lerJson(MvcResult resultado) throws Exception {
        return json.readTree(resultado.getResponse().getContentAsByteArray());
    }
}
