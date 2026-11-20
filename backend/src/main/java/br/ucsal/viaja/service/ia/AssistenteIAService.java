package br.ucsal.viaja.service.ia;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import br.ucsal.viaja.domain.GeracaoRoteiro;
import br.ucsal.viaja.domain.Hospedagem;
import br.ucsal.viaja.domain.Oferta;
import br.ucsal.viaja.domain.Passagem;
import br.ucsal.viaja.domain.Passeio;
import br.ucsal.viaja.dto.OfertaDTO;
import br.ucsal.viaja.dto.Requisicoes.PedidoRoteiro;
import br.ucsal.viaja.dto.Requisicoes.UsoAssistente;
import br.ucsal.viaja.dto.RoteiroDTO;
import br.ucsal.viaja.exception.LimiteExcedidoException;
import br.ucsal.viaja.exception.RegraNegocioException;
import br.ucsal.viaja.repository.GeracaoRoteiroRepository;
import br.ucsal.viaja.repository.OfertaRepository;
import br.ucsal.viaja.service.Texto;
import lombok.RequiredArgsConstructor;

/**
 * Assistente de Roteiro com IA (RF-09, seção 10 do planejamento).
 *
 * Passo a passo: (1) valida o pedido e o limite diário; (2) busca no banco as ofertas ativas do destino
 * e do período; (3) envia ao modelo o pedido e a lista resumida de ofertas; (4) recebe um JSON com os ids
 * escolhidos; (5) valida a resposta, descartando ids inexistentes, itens fora das datas e o que estourar
 * o orçamento. Se a IA falhar ou não estiver configurada, monta um roteiro padrão por regra simples.
 * O modelo nunca inventa ofertas: só o que existe no banco entra no roteiro (RN-09).
 */
@Service
@RequiredArgsConstructor
public class AssistenteIAService {

    private static final Logger log = LoggerFactory.getLogger(AssistenteIAService.class);

    private static final LocalTime HORARIO_CHECKIN = LocalTime.of(14, 0);
    private static final int MAXIMO_PASSEIOS_POR_DIA = 2;
    private static final int MAXIMO_DIAS = 30;

    static final String INSTRUCOES = """
            Você é o planejador de viagens do ViaJá, uma plataforma de turismo da Bahia.
            Monte roteiros usando SOMENTE as ofertas que receber, identificadas pelo campo "id".
            Responda apenas com um objeto JSON válido, sem texto antes ou depois e sem bloco de código.
            """;

    private final OfertaRepository ofertas;
    private final GeracaoRoteiroRepository geracoes;
    private final ClienteLLM llm;
    private final ObjectMapper json;

    @Value("${viaja.ia.limite-diario:5}")
    private int limiteDiario;

    public UsoAssistente uso(Long usuarioId) {
        long usados = usadosHoje(usuarioId);
        return new UsoAssistente(usados, limiteDiario, Math.max(0, limiteDiario - usados));
    }

    public RoteiroDTO gerarRoteiro(Long usuarioId, PedidoRoteiro pedido) {
        validar(pedido);
        // RN-09: até 5 roteiros por usuário por dia, para controlar o custo da API.
        long usados = usadosHoje(usuarioId);
        if (usados >= limiteDiario) {
            throw new LimiteExcedidoException("Você atingiu o limite de " + limiteDiario
                    + " roteiros por dia. Tente novamente amanhã.");
        }

        Candidatos candidatos = buscarCandidatos(pedido);
        if (candidatos.vazio()) {
            throw new RegraNegocioException("Não encontramos ofertas ativas para " + pedido.destino().trim()
                    + " nesse período. Tente outras datas ou outro destino.");
        }

        Escolha escolha = null;
        String aviso = null;
        if (llm.disponivel()) {
            try {
                escolha = interpretar(llm.completar(INSTRUCOES, montarPrompt(pedido, candidatos)), candidatos);
            } catch (RuntimeException e) {
                log.warn("Assistente de IA falhou, usando roteiro padrão: {}", e.getMessage());
            }
            if (escolha == null || escolha.motivos().isEmpty()) {
                escolha = null;
                aviso = "O assistente de IA não respondeu a tempo. Mostramos um roteiro padrão, montado com as "
                        + "ofertas mais bem avaliadas que cabem no seu orçamento.";
            }
        } else {
            aviso = "O assistente de IA não está configurado neste ambiente. Mostramos um roteiro padrão, "
                    + "montado com as ofertas mais bem avaliadas que cabem no seu orçamento.";
        }

        String fonte = "IA";
        if (escolha == null) {
            escolha = roteiroPadrao(pedido, candidatos);
            fonte = "PADRAO";
        }

        Plano plano = montarPlano(pedido, candidatos, escolha);
        geracoes.save(new GeracaoRoteiro(usuarioId, fonte));
        return paraDTO(pedido, candidatos, plano, fonte, aviso, (int) Math.max(0, limiteDiario - usados - 1));
    }

    // ---------------------------------------------------------------- passo 2: ofertas candidatas

    private Candidatos buscarCandidatos(PedidoRoteiro pedido) {
        int pessoas = pedido.pessoas();
        BigDecimal orcamento = pedido.orcamento();
        String destino = pedido.destino();
        boolean temOrigem = !Texto.vazio(pedido.origem()) && !Texto.igual(pedido.origem(), destino);

        List<Passagem> passagens = temOrigem ? ofertas.passagensDisponiveis(LocalDateTime.now()) : List.of();
        List<Passagem> idas = passagens.stream()
                .filter(p -> Texto.igual(p.getOrigem(), pedido.origem()) && Texto.igual(p.getDestino(), destino))
                .filter(p -> p.getPartida().toLocalDate().equals(pedido.dataIda()))
                .filter(p -> p.getVagas() >= pessoas && p.custoPara(pessoas, null).compareTo(orcamento) <= 0)
                .sorted(Comparator.comparing(Passagem::getPreco))
                .toList();
        List<Passagem> voltas = passagens.stream()
                .filter(p -> Texto.igual(p.getOrigem(), destino) && Texto.igual(p.getDestino(), pedido.origem()))
                .filter(p -> p.getPartida().toLocalDate().equals(pedido.dataVolta()))
                .filter(p -> p.getVagas() >= pessoas && p.custoPara(pessoas, null).compareTo(orcamento) <= 0)
                .sorted(Comparator.comparing(Passagem::getPreco))
                .toList();

        int noitesMaximas = (int) ChronoUnit.DAYS.between(pedido.dataIda(), pedido.dataVolta());
        List<Hospedagem> hospedagens = noitesMaximas < 1 ? List.of() : ofertas.hospedagensDisponiveis().stream()
                .filter(h -> Texto.igual(h.getCidade(), destino))
                .filter(h -> h.getVagas() >= h.unidadesPara(pessoas))
                .filter(h -> h.custoPara(pessoas, 1).compareTo(orcamento) <= 0)
                .sorted(Comparator.comparing(Hospedagem::getPreco))
                .toList();

        List<Passeio> passeios = ofertas.passeiosDisponiveis(LocalDate.now()).stream()
                .filter(p -> Texto.igual(p.getCidade(), destino))
                .filter(p -> !p.getData().isBefore(pedido.dataIda()) && !p.getData().isAfter(pedido.dataVolta()))
                .filter(p -> p.getVagas() >= pessoas && p.custoPara(pessoas, null).compareTo(orcamento) <= 0)
                .sorted(Comparator.comparing(Passeio::inicio))
                .toList();

        return new Candidatos(idas, voltas, hospedagens, passeios);
    }

    // ---------------------------------------------------------------- passo 3: prompt

    String montarPrompt(PedidoRoteiro pedido, Candidatos c) {
        int pessoas = pedido.pessoas();
        int noites = (int) ChronoUnit.DAYS.between(pedido.dataIda(), pedido.dataVolta());
        List<Map<String, Object>> lista = new ArrayList<>();
        c.idas().forEach(p -> lista.add(resumoPassagem(p, "IDA", pessoas)));
        c.voltas().forEach(p -> lista.add(resumoPassagem(p, "VOLTA", pessoas)));
        for (Hospedagem h : c.hospedagens()) {
            Map<String, Object> m = resumoBase(h, "HOSPEDAGEM", h.custoPara(pessoas, noites));
            m.put("tipo", h.getTipoHospedagem().name());
            m.put("noites", noites);
            m.put("comodidades", h.getComodidades());
            lista.add(m);
        }
        for (Passeio p : c.passeios()) {
            Map<String, Object> m = resumoBase(p, "PASSEIO", p.custoPara(pessoas, null));
            m.put("data", p.getData().toString());
            m.put("horario", p.inicio().toLocalTime().toString());
            m.put("duracaoHoras", p.getDuracaoHoras());
            m.put("categoria", p.getCategoria());
            lista.add(m);
        }
        String ofertasJson;
        try {
            ofertasJson = json.writeValueAsString(lista);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Não foi possível montar a lista de ofertas para a IA.", e);
        }
        String interesses = pedido.interesses() == null || pedido.interesses().isEmpty()
                ? "nenhum em especial" : String.join(", ", pedido.interesses());
        String origem = Texto.vazio(pedido.origem()) ? "não informada" : pedido.origem().trim();

        return """
                Monte um roteiro usando SOMENTE as ofertas da lista abaixo.

                Pedido: origem %s, destino %s, de %s a %s, %d pessoa(s), orçamento total %s, interesses: %s.

                Regras:
                - Escolha no máximo uma oferta com papel IDA, uma com papel VOLTA e uma com papel HOSPEDAGEM.
                - Escolha os passeios que mais combinam com os interesses, sem sobrepor horários, depois da chegada e antes da volta. No máximo %d por dia, e nunca o mesmo passeio em dois dias.
                - A soma dos campos custoParaOGrupo das ofertas escolhidas não pode passar do orçamento. Se precisar, prefira opções mais baratas ou menos passeios.
                - Use apenas ids que aparecem na lista. Não invente ofertas.
                - Em "motivo", explique em uma frase curta por que escolheu o item. Em "observacoes", resuma o roteiro em até duas frases.

                Ofertas disponíveis (JSON):
                %s

                Responda apenas em JSON no formato:
                { "dias": [ { "data": "AAAA-MM-DD", "itens": [ { "ofertaId": 0, "horario": "HH:MM", "motivo": "" } ] } ], "custoTotal": 0, "observacoes": "" }
                """.formatted(origem, pedido.destino().trim(), pedido.dataIda(), pedido.dataVolta(), pessoas,
                Texto.reais(pedido.orcamento()), interesses, MAXIMO_PASSEIOS_POR_DIA, ofertasJson);
    }

    private Map<String, Object> resumoPassagem(Passagem p, String papel, int pessoas) {
        Map<String, Object> m = resumoBase(p, papel, p.custoPara(pessoas, null));
        m.put("transporte", p.getTipoTransporte().name());
        m.put("partida", p.getPartida().toString());
        m.put("chegada", p.getChegada().toString());
        return m;
    }

    private Map<String, Object> resumoBase(Oferta o, String papel, BigDecimal custoParaOGrupo) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", o.getId());
        m.put("papel", papel);
        m.put("nome", o.getTitulo());
        m.put("custoParaOGrupo", custoParaOGrupo);
        if (o.getTotalAvaliacoes() > 0) {
            m.put("notaMedia", o.getNotaMedia());
        }
        return m;
    }

    // ---------------------------------------------------------------- passos 4 e 5: resposta da IA

    /** Lê o JSON da IA e fica só com os ids que realmente estão entre as ofertas candidatas. */
    Escolha interpretar(String resposta, Candidatos candidatos) {
        if (resposta == null) {
            return null;
        }
        int inicio = resposta.indexOf('{');
        int fim = resposta.lastIndexOf('}');
        if (inicio < 0 || fim <= inicio) {
            return null;
        }
        RespostaIA lida;
        try {
            lida = json.readValue(resposta.substring(inicio, fim + 1), RespostaIA.class);
        } catch (JsonProcessingException e) {
            log.warn("Resposta da IA não é um JSON válido: {}", e.getOriginalMessage());
            return null;
        }
        Map<Long, Oferta> validas = candidatos.porId();
        Map<Long, String> motivos = new LinkedHashMap<>();
        if (lida.dias() != null) {
            for (DiaIA dia : lida.dias()) {
                if (dia == null || dia.itens() == null) {
                    continue;
                }
                for (ItemIA item : dia.itens()) {
                    if (item != null && item.ofertaId() != null && validas.containsKey(item.ofertaId())) {
                        motivos.putIfAbsent(item.ofertaId(), Texto.vazio(item.motivo()) ? "" : item.motivo().trim());
                    }
                }
            }
        }
        return new Escolha(motivos, lida.observacoes());
    }

    // ---------------------------------------------------------------- roteiro padrão (fallback, RNF-02)

    /** Regra simples: transporte mais barato, hospedagem mais bem avaliada que cabe e passeios pelos interesses. */
    Escolha roteiroPadrao(PedidoRoteiro pedido, Candidatos c) {
        int pessoas = pedido.pessoas();
        Map<Long, String> motivos = new LinkedHashMap<>();
        BigDecimal restante = pedido.orcamento();

        Passagem ida = c.idas().isEmpty() ? null : c.idas().get(0);
        Passagem volta = c.voltas().isEmpty() ? null : c.voltas().get(0);
        if (ida != null) {
            motivos.put(ida.getId(), "Opção mais barata para a ida.");
            restante = restante.subtract(ida.custoPara(pessoas, null));
        }
        if (volta != null) {
            motivos.put(volta.getId(), "Opção mais barata para a volta.");
            restante = restante.subtract(volta.custoPara(pessoas, null));
        }

        Janela janela = Janela.de(pedido, ida, volta);
        if (janela.noites() > 0 && !c.hospedagens().isEmpty()) {
            BigDecimal limite = restante;
            Optional<Hospedagem> melhor = c.hospedagens().stream()
                    .filter(h -> h.custoPara(pessoas, janela.noites()).compareTo(limite) <= 0)
                    .max(Comparator.comparingDouble(Hospedagem::getNotaMedia)
                            .thenComparing(Hospedagem::getPreco, Comparator.reverseOrder()));
            Hospedagem escolhida = melhor.orElse(c.hospedagens().get(0));
            motivos.put(escolhida.getId(), melhor.isPresent()
                    ? "Hospedagem mais bem avaliada dentro do orçamento."
                    : "Hospedagem mais barata disponível.");
            restante = restante.subtract(escolhida.custoPara(pessoas, janela.noites()));
        }

        List<String> interesses = pedido.interesses() == null ? List.of() : pedido.interesses();
        List<Passeio> ordenados = c.passeios().stream()
                .sorted(Comparator.comparingInt((Passeio p) -> interesseAtendido(p, interesses).isPresent() ? 0 : 1)
                        .thenComparing(Comparator.comparingDouble(Passeio::getNotaMedia).reversed())
                        .thenComparing(Passeio::getPreco))
                .toList();
        List<Passeio> escolhidos = new ArrayList<>();
        for (Passeio passeio : ordenados) {
            BigDecimal custo = passeio.custoPara(pessoas, null);
            boolean cabeNoBolso = custo.compareTo(restante) <= 0;
            // Uma hora de folga depois da chegada e antes da volta.
            boolean cabeNaViagem = !passeio.inicio().isBefore(janela.chegada().plusHours(1))
                    && !passeio.fim().isAfter(janela.saida().minusHours(1));
            long noMesmoDia = escolhidos.stream().filter(p -> p.getData().equals(passeio.getData())).count();
            // O mesmo passeio existe em várias datas (cada data é uma oferta): entra no roteiro uma vez só.
            boolean livre = escolhidos.stream().noneMatch(p -> sobrepoe(p, passeio) || mesmoPasseio(p, passeio));
            if (cabeNoBolso && cabeNaViagem && livre && noMesmoDia < MAXIMO_PASSEIOS_POR_DIA) {
                escolhidos.add(passeio);
                motivos.put(passeio.getId(), interesseAtendido(passeio, interesses)
                        .map(i -> "Combina com seu interesse em " + i.toLowerCase() + ".")
                        .orElse("Bem avaliado pelos viajantes."));
                restante = restante.subtract(custo);
            }
        }
        return new Escolha(motivos, "Roteiro padrão: transporte mais barato, hospedagem mais bem avaliada dentro "
                + "do orçamento e passeios alinhados aos seus interesses.");
    }

    private Optional<String> interesseAtendido(Passeio passeio, List<String> interesses) {
        return interesses.stream()
                .filter(i -> !Texto.vazio(i))
                .filter(i -> Texto.igual(passeio.getCategoria(), i)
                        || Texto.contem(passeio.getTitulo(), singular(i))
                        || Texto.contem(passeio.getDescricao(), singular(i)))
                .findFirst();
    }

    /** "Trilhas" e "Cachoeiras" também encontram "trilha" e "cachoeira" no texto do passeio. */
    private static String singular(String interesse) {
        String texto = interesse.trim();
        return texto.length() > 4 && texto.toLowerCase().endsWith("s") ? texto.substring(0, texto.length() - 1) : texto;
    }

    // ---------------------------------------------------------------- validação final e montagem

    /**
     * Aplica as mesmas regras à escolha da IA e à do roteiro padrão: no máximo uma ida, uma volta e uma
     * hospedagem; passeios entre a chegada e a saída e sem sobreposição; custo total dentro do orçamento.
     */
    Plano montarPlano(PedidoRoteiro pedido, Candidatos c, Escolha escolha) {
        int pessoas = pedido.pessoas();
        Map<Long, String> motivos = new LinkedHashMap<>(escolha.motivos());
        List<Long> ids = List.copyOf(escolha.motivos().keySet());

        Passagem ida = primeiraEscolhida(c.idas(), ids);
        Passagem volta = primeiraEscolhida(c.voltas(), ids);
        Hospedagem hospedagem = primeiraEscolhida(c.hospedagens(), ids);
        Janela janela = Janela.de(pedido, ida, volta);
        if (janela.noites() < 1) {
            hospedagem = null;
        }

        List<Passeio> passeios = new ArrayList<>();
        for (Passeio passeio : c.passeios()) {
            boolean escolhido = ids.contains(passeio.getId());
            boolean cabeNaViagem = !passeio.inicio().isBefore(janela.chegada())
                    && !passeio.fim().isAfter(janela.saida());
            if (escolhido && cabeNaViagem
                    && passeios.stream().noneMatch(p -> sobrepoe(p, passeio) || mesmoPasseio(p, passeio))) {
                passeios.add(passeio);
            }
        }

        // Corta até caber no orçamento: primeiro os passeios mais caros, depois troca por opções mais baratas.
        BigDecimal orcamento = pedido.orcamento();
        while (custo(pessoas, janela.noites(), ida, volta, hospedagem, passeios).compareTo(orcamento) > 0
                && !passeios.isEmpty()) {
            passeios.remove(passeios.stream().max(Comparator.comparing(Passeio::getPreco)).orElseThrow());
        }
        if (custo(pessoas, janela.noites(), ida, volta, hospedagem, passeios).compareTo(orcamento) > 0
                && hospedagem != null && c.hospedagens().get(0) != hospedagem) {
            hospedagem = c.hospedagens().get(0);
            motivos.put(hospedagem.getId(), "Opção mais barata, para caber no orçamento.");
        }
        if (custo(pessoas, janela.noites(), ida, volta, hospedagem, passeios).compareTo(orcamento) > 0
                && ida != null && c.idas().get(0) != ida) {
            ida = c.idas().get(0);
            motivos.put(ida.getId(), "Opção mais barata, para caber no orçamento.");
        }
        if (custo(pessoas, janela.noites(), ida, volta, hospedagem, passeios).compareTo(orcamento) > 0
                && volta != null && c.voltas().get(0) != volta) {
            volta = c.voltas().get(0);
            motivos.put(volta.getId(), "Opção mais barata, para caber no orçamento.");
        }
        // Se o transporte foi trocado, a chegada e a saída mudaram: refaz a janela e revalida os passeios.
        Janela janelaFinal = Janela.de(pedido, ida, volta);
        passeios.removeIf(p -> p.inicio().isBefore(janelaFinal.chegada()) || p.fim().isAfter(janelaFinal.saida()));
        if (janelaFinal.noites() < 1) {
            hospedagem = null;
        }
        janela = janelaFinal;
        BigDecimal total = custo(pessoas, janela.noites(), ida, volta, hospedagem, passeios);
        if (total.compareTo(orcamento) > 0) {
            throw new RegraNegocioException("O orçamento de " + Texto.reais(orcamento)
                    + " não cobre transporte e hospedagem para esse período (mínimo estimado: " + Texto.reais(total)
                    + "). Aumente o orçamento ou reduza os dias.");
        }
        if (ida == null && volta == null && hospedagem == null && passeios.isEmpty()) {
            throw new RegraNegocioException("Não foi possível montar um roteiro com as ofertas disponíveis para "
                    + "esse período e orçamento.");
        }
        return new Plano(ida, volta, hospedagem, janela, passeios, motivos, escolha.observacoes(), total);
    }

    private RoteiroDTO paraDTO(PedidoRoteiro pedido, Candidatos c, Plano plano, String fonte, String aviso,
                               int restantesHoje) {
        int pessoas = pedido.pessoas();
        Map<LocalDate, List<RoteiroDTO.Item>> porData = new TreeMap<>();

        if (plano.ida() != null) {
            adicionar(porData, plano.ida().getPartida().toLocalDate(),
                    item(plano, plano.ida(), plano.ida().getPartida().toLocalTime(), null, pessoas));
        }
        if (plano.hospedagem() != null) {
            LocalTime chegada = plano.janela().chegada().toLocalTime();
            LocalTime checkin = plano.ida() != null && chegada.isAfter(HORARIO_CHECKIN) ? chegada : HORARIO_CHECKIN;
            adicionar(porData, plano.janela().checkin(),
                    item(plano, plano.hospedagem(), checkin, plano.janela().noites(), pessoas));
        }
        for (Passeio passeio : plano.passeios()) {
            adicionar(porData, passeio.getData(), item(plano, passeio, passeio.inicio().toLocalTime(), null, pessoas));
        }
        if (plano.volta() != null) {
            adicionar(porData, plano.volta().getPartida().toLocalDate(),
                    item(plano, plano.volta(), plano.volta().getPartida().toLocalTime(), null, pessoas));
        }

        List<RoteiroDTO.Dia> dias = new ArrayList<>();
        int totalDias = (int) ChronoUnit.DAYS.between(pedido.dataIda(), pedido.dataVolta()) + 1;
        for (int i = 0; i < totalDias; i++) {
            LocalDate data = pedido.dataIda().plusDays(i);
            List<RoteiroDTO.Item> itens = porData.getOrDefault(data, List.of()).stream()
                    .sorted(Comparator.comparing(RoteiroDTO.Item::horario))
                    .toList();
            dias.add(new RoteiroDTO.Dia(i + 1, data, itens));
        }

        return new RoteiroDTO(
                Texto.vazio(pedido.origem()) ? null : pedido.origem().trim(), pedido.destino().trim(),
                pedido.dataIda(), pedido.dataVolta(), pessoas, pedido.orcamento(), plano.custoTotal(),
                observacoes(pedido, c, plano), fonte, aviso, restantesHoje, dias);
    }

    private String observacoes(PedidoRoteiro pedido, Candidatos c, Plano plano) {
        StringBuilder texto = new StringBuilder(Texto.vazio(plano.observacoes())
                ? "Roteiro montado com as ofertas cadastradas no ViaJá." : plano.observacoes().trim());
        boolean pediuTransporte = !Texto.vazio(pedido.origem()) && !Texto.igual(pedido.origem(), pedido.destino());
        if (pediuTransporte && c.idas().isEmpty()) {
            texto.append(" Não há passagem cadastrada de ").append(pedido.origem().trim()).append(" para ")
                    .append(pedido.destino().trim()).append(" em ").append(pedido.dataIda().format(Texto.DIA_MES))
                    .append('.');
        }
        if (pediuTransporte && c.voltas().isEmpty()) {
            texto.append(" Não há passagem de volta cadastrada para ")
                    .append(pedido.dataVolta().format(Texto.DIA_MES)).append('.');
        }
        if (plano.hospedagem() == null && plano.janela().noites() > 0) {
            texto.append(" Nenhuma hospedagem entrou no roteiro; inclua uma pela busca de hospedagens.");
        }
        return texto.toString();
    }

    private RoteiroDTO.Item item(Plano plano, Oferta oferta, LocalTime horario, Integer noites, int pessoas) {
        String motivo = plano.motivos().get(oferta.getId());
        return new RoteiroDTO.Item(oferta.getId(), horario, noites, Texto.vazio(motivo) ? null : motivo,
                oferta.custoPara(pessoas, noites), OfertaDTO.de(oferta));
    }

    private static void adicionar(Map<LocalDate, List<RoteiroDTO.Item>> porData, LocalDate data, RoteiroDTO.Item item) {
        porData.computeIfAbsent(data, d -> new ArrayList<>()).add(item);
    }

    private static BigDecimal custo(int pessoas, int noites, Passagem ida, Passagem volta, Hospedagem hospedagem,
                                    List<Passeio> passeios) {
        BigDecimal total = BigDecimal.ZERO;
        if (ida != null) {
            total = total.add(ida.custoPara(pessoas, null));
        }
        if (volta != null) {
            total = total.add(volta.custoPara(pessoas, null));
        }
        if (hospedagem != null) {
            total = total.add(hospedagem.custoPara(pessoas, noites));
        }
        for (Passeio passeio : passeios) {
            total = total.add(passeio.custoPara(pessoas, null));
        }
        return total;
    }

    private static boolean sobrepoe(Passeio a, Passeio b) {
        return a.inicio().isBefore(b.fim()) && b.inicio().isBefore(a.fim());
    }

    private static boolean mesmoPasseio(Passeio a, Passeio b) {
        return Texto.igual(a.getTitulo(), b.getTitulo()) && Texto.igual(a.getCidade(), b.getCidade());
    }

    /** Primeira oferta da lista de candidatas que aparece entre os ids escolhidos, na ordem da escolha. */
    private static <T extends Oferta> T primeiraEscolhida(List<T> candidatas, List<Long> idsEscolhidos) {
        for (Long id : idsEscolhidos) {
            for (T candidata : candidatas) {
                if (candidata.getId().equals(id)) {
                    return candidata;
                }
            }
        }
        return null;
    }

    private void validar(PedidoRoteiro pedido) {
        if (pedido.dataVolta().isBefore(pedido.dataIda())) {
            throw new RegraNegocioException("A data de volta precisa ser igual ou posterior à data de ida.");
        }
        if (pedido.dataIda().isBefore(LocalDate.now())) {
            throw new RegraNegocioException("A data de ida já passou.");
        }
        if (ChronoUnit.DAYS.between(pedido.dataIda(), pedido.dataVolta()) + 1 > MAXIMO_DIAS) {
            throw new RegraNegocioException("O roteiro pode ter no máximo " + MAXIMO_DIAS + " dias.");
        }
    }

    private long usadosHoje(Long usuarioId) {
        return geracoes.countByUsuarioIdAndCriadaEmGreaterThanEqual(usuarioId, LocalDate.now().atStartOfDay());
    }

    // ---------------------------------------------------------------- tipos de apoio

    /** Ofertas ativas do destino e do período, já ordenadas por preço (passagens e hospedagens). */
    record Candidatos(List<Passagem> idas, List<Passagem> voltas, List<Hospedagem> hospedagens,
                      List<Passeio> passeios) {

        boolean vazio() {
            return idas.isEmpty() && voltas.isEmpty() && hospedagens.isEmpty() && passeios.isEmpty();
        }

        Map<Long, Oferta> porId() {
            Map<Long, Oferta> mapa = new LinkedHashMap<>();
            idas.forEach(o -> mapa.put(o.getId(), o));
            voltas.forEach(o -> mapa.put(o.getId(), o));
            hospedagens.forEach(o -> mapa.put(o.getId(), o));
            passeios.forEach(o -> mapa.put(o.getId(), o));
            return mapa;
        }
    }

    /** Ids escolhidos (pela IA ou pela regra), na ordem, com o motivo de cada um. */
    record Escolha(Map<Long, String> motivos, String observacoes) {
    }

    /** Chegada ao destino, saída dele, data de check-in e número de noites. */
    record Janela(LocalDateTime chegada, LocalDateTime saida, LocalDate checkin, int noites) {

        static Janela de(PedidoRoteiro pedido, Passagem ida, Passagem volta) {
            LocalDateTime chegada = ida != null ? ida.getChegada() : pedido.dataIda().atStartOfDay();
            LocalDateTime saida = volta != null ? volta.getPartida() : pedido.dataVolta().plusDays(1).atStartOfDay();
            LocalDate checkin = chegada.toLocalDate();
            LocalDate checkout = volta != null ? volta.getPartida().toLocalDate() : pedido.dataVolta();
            return new Janela(chegada, saida, checkin, (int) Math.max(0, ChronoUnit.DAYS.between(checkin, checkout)));
        }
    }

    record Plano(Passagem ida, Passagem volta, Hospedagem hospedagem, Janela janela, List<Passeio> passeios,
                 Map<Long, String> motivos, String observacoes, BigDecimal custoTotal) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record RespostaIA(List<DiaIA> dias, String observacoes) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record DiaIA(String data, List<ItemIA> itens) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record ItemIA(Long ofertaId, String horario, String motivo) {
    }
}
