package br.ucsal.viaja.config;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import br.ucsal.viaja.domain.Administrador;
import br.ucsal.viaja.domain.Avaliacao;
import br.ucsal.viaja.domain.Fornecedor;
import br.ucsal.viaja.domain.Hospedagem;
import br.ucsal.viaja.domain.ItemItinerario;
import br.ucsal.viaja.domain.Itinerario;
import br.ucsal.viaja.domain.Notificacao;
import br.ucsal.viaja.domain.Oferta;
import br.ucsal.viaja.domain.Passagem;
import br.ucsal.viaja.domain.Passeio;
import br.ucsal.viaja.domain.Reserva;
import br.ucsal.viaja.domain.StatusReserva;
import br.ucsal.viaja.domain.TipoHospedagem;
import br.ucsal.viaja.domain.TipoNotificacao;
import br.ucsal.viaja.domain.TipoTransporte;
import br.ucsal.viaja.domain.Usuario;
import br.ucsal.viaja.domain.Viajante;
import br.ucsal.viaja.repository.AvaliacaoRepository;
import br.ucsal.viaja.repository.ItinerarioRepository;
import br.ucsal.viaja.repository.NotificacaoRepository;
import br.ucsal.viaja.repository.OfertaRepository;
import br.ucsal.viaja.repository.ReservaRepository;
import br.ucsal.viaja.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;

/**
 * Base de demonstração (seção 1.9 do planejamento): cidades da Bahia, fornecedores, ofertas e
 * viajantes fictícios. O banco é o H2 em memória, então a base é recriada a cada início da
 * aplicação, com passagens e passeios datados para os próximos 21 dias a partir de hoje.
 *
 * Todas as contas de demonstração usam a senha definida em SEED_SENHA (ver README).
 */
@Component
@RequiredArgsConstructor
public class DataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);
    private static final int DIAS_A_FRENTE = 21;

    private static final String EMAIL_ONIBUS = "onibus@viaja.com";
    private static final String EMAIL_AEREO = "aereo@viaja.com";
    private static final String EMAIL_GUIA = "guia@viaja.com";
    private static final String EMAIL_PASSEIOS = "passeios@viaja.com";

    private final UsuarioRepository usuarios;
    private final OfertaRepository ofertas;
    private final ReservaRepository reservas;
    private final AvaliacaoRepository avaliacoes;
    private final ItinerarioRepository itinerarios;
    private final NotificacaoRepository notificacoes;
    private final PasswordEncoder passwordEncoder;

    @Value("${viaja.seed.ativo:true}")
    private boolean ativo;

    @Value("${viaja.seed.senha:viaja123}")
    private String senha;

    private String senhaHash;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!ativo || usuarios.count() > 0) {
            return;
        }
        senhaHash = passwordEncoder.encode(senha);
        criarUsuariosEHospedagens();
        criarHistoricoDeExemplo(criarOfertasDatadas());
        log.info("Base de demonstração criada: {} usuários e {} ofertas.", usuarios.count(), ofertas.count());
    }

    // ---------------------------------------------------------------- usuários e hospedagens

    private void criarUsuariosEHospedagens() {
        usuario(new Administrador(), "Administrador ViaJá", "admin@viaja.com", 1988);

        Viajante ana = usuario(new Viajante(), "Ana Souza", "ana@viaja.com", 1996);
        ana.setInteresses(new ArrayList<>(List.of("Natureza", "Trilhas", "Cachoeiras")));
        Viajante bruno = usuario(new Viajante(), "Bruno Lima", "bruno@viaja.com", 1990);
        Viajante carla = usuario(new Viajante(), "Carla Reis", "carla@viaja.com", 1993);
        Viajante diego = usuario(new Viajante(), "Diego Santos", "diego@viaja.com", 1985);

        fornecedor("Marta Oliveira", EMAIL_ONIBUS, "Rápido Chapada Transportes", "12.345.678/0001-01", true);
        fornecedor("Paulo Nunes", EMAIL_AEREO, "Voa Bahia Linhas Aéreas", "23.456.789/0001-02", true);
        fornecedor("Joana Castro", EMAIL_GUIA, "Chapada Aventura Guias", "45.678.901/0001-04", true);
        fornecedor("Rafael Moreira", EMAIL_PASSEIOS, "Bahia Mar Passeios", "56.789.012/0001-05", true);
        Fornecedor serra = fornecedor("Lúcia Andrade", "pousada@viaja.com", "Pousada Serra Viva", "34.567.890/0001-03", true);
        Fornecedor rede = fornecedor("Henrique Bastos", "hoteis@viaja.com", "Rede Costa Dourada", "67.890.123/0001-06", true);
        // Aguardando aprovação: serve para demonstrar a RN-06 no painel do administrador.
        fornecedor("Tereza Matos", "novo@viaja.com", "Pousada Maré Alta", "78.901.234/0001-07", false);

        // A Ana não avalia nada aqui: ela avalia a viagem dela ao vivo, na demonstração.
        List<Viajante> avaliadores = List.of(bruno, carla, diego);
        int[][] notas = {
                {5, 5, 4}, {5, 4}, {4, 4, 5}, {5, 5, 5, 4},
                {4, 5, 4}, {5, 4, 4}, {4, 3},
                {4, 5}, {5, 5, 4}, {4, 4}, {5, 4},
                {5, 5}, {4, 5, 5}, {5, 4}, {5, 5, 4}
        };
        List<Hospedagem> lista = List.of(
                hospedagem(serra, "Pousada Serra Viva (quarto duplo)", "Lençóis", TipoHospedagem.POUSADA, "220.00", 2, 6,
                        "Pousada familiar a 5 minutos a pé do centro histórico, com jardim e redes na varanda.",
                        "Wi-Fi", "Café da manhã", "Ar-condicionado"),
                hospedagem(serra, "Pousada Serra Viva (chalé família)", "Lençóis", TipoHospedagem.POUSADA, "340.00", 4, 3,
                        "Chalé com dois quartos e varanda com vista para a serra, ideal para famílias.",
                        "Wi-Fi", "Café da manhã", "Ar-condicionado", "Estacionamento"),
                hospedagem(serra, "Hostel Trilha Verde (cama em quarto compartilhado)", "Lençóis", TipoHospedagem.HOSTEL, "75.00", 1, 12,
                        "Hostel animado para quem vai fazer trilha, com cozinha coletiva e guarda-volumes.",
                        "Wi-Fi", "Cozinha"),
                hospedagem(rede, "Hotel Mirante do Vale", "Lençóis", TipoHospedagem.HOTEL, "390.00", 2, 10,
                        "Hotel com piscina e vista para o vale, a 10 minutos do centro.",
                        "Wi-Fi", "Café da manhã", "Piscina", "Ar-condicionado", "Estacionamento"),
                hospedagem(rede, "Hotel Farol da Barra", "Salvador", TipoHospedagem.HOTEL, "320.00", 2, 20,
                        "Em frente à praia do Farol da Barra, com café da manhã servido no terraço.",
                        "Wi-Fi", "Café da manhã", "Piscina", "Ar-condicionado"),
                hospedagem(rede, "Pousada Largo do Carmo", "Salvador", TipoHospedagem.POUSADA, "210.00", 2, 8,
                        "Casarão restaurado no Santo Antônio Além do Carmo, pertinho do Pelourinho.",
                        "Wi-Fi", "Café da manhã", "Ar-condicionado"),
                hospedagem(rede, "Hostel Rio Vermelho", "Salvador", TipoHospedagem.HOSTEL, "80.00", 1, 16,
                        "No bairro boêmio de Salvador, perto dos bares e do acarajé.",
                        "Wi-Fi", "Cozinha"),
                hospedagem(rede, "Hotel Coroa Dourada", "Porto Seguro", TipoHospedagem.HOTEL, "290.00", 3, 15,
                        "A uma quadra da orla norte, com piscina e quartos triplos.",
                        "Wi-Fi", "Café da manhã", "Piscina", "Ar-condicionado", "Estacionamento"),
                hospedagem(rede, "Pousada Quadrado Verde", "Porto Seguro", TipoHospedagem.POUSADA, "240.00", 2, 7,
                        "Pousada tranquila com jardim tropical, perto da balsa para Arraial.",
                        "Wi-Fi", "Café da manhã", "Ar-condicionado"),
                hospedagem(rede, "Hotel Cacau Praia", "Ilhéus", TipoHospedagem.HOTEL, "260.00", 2, 12,
                        "Na avenida da praia, com vista para o mar e estacionamento.",
                        "Wi-Fi", "Café da manhã", "Ar-condicionado", "Estacionamento"),
                hospedagem(rede, "Pousada Terra do Cacau", "Ilhéus", TipoHospedagem.POUSADA, "170.00", 2, 6,
                        "Pousada simples e acolhedora no centro histórico.",
                        "Wi-Fi", "Café da manhã"),
                hospedagem(rede, "Pousada Mata Atlântica", "Itacaré", TipoHospedagem.POUSADA, "230.00", 2, 8,
                        "Cercada de mata, a 300 metros da praia da Concha, com piscina.",
                        "Wi-Fi", "Café da manhã", "Piscina", "Pet friendly"),
                hospedagem(rede, "Casa Surf Itacaré", "Itacaré", TipoHospedagem.CASA, "420.00", 6, 2,
                        "Casa inteira para até 6 pessoas, com cozinha equipada e churrasqueira.",
                        "Wi-Fi", "Cozinha", "Estacionamento", "Pet friendly"),
                hospedagem(rede, "Pousada Vila dos Corais", "Praia do Forte", TipoHospedagem.POUSADA, "310.00", 2, 9,
                        "Na vila de Praia do Forte, com piscina e bicicletas para os hóspedes.",
                        "Wi-Fi", "Café da manhã", "Piscina", "Ar-condicionado"),
                hospedagem(rede, "Casa das Tartarugas", "Praia do Forte", TipoHospedagem.CASA, "520.00", 6, 2,
                        "Casa de praia para grupos, a 200 metros do mar.",
                        "Wi-Fi", "Cozinha", "Piscina", "Estacionamento"));
        ofertas.saveAll(lista);
        ofertas.flush();

        // Avaliações reais das hospedagens: cada uma nasce de uma reserva confirmada e já encerrada (RN-04).
        for (int i = 0; i < lista.size(); i++) {
            Hospedagem h = lista.get(i);
            int soma = 0;
            for (int j = 0; j < notas[i].length; j++) {
                Viajante autor = avaliadores.get((i + j) % avaliadores.size());
                avaliar(autor, h, 25 + 9 * i + 17 * j, notas[i][j]);
                soma += notas[i][j];
            }
            h.setTotalAvaliacoes(notas[i].length);
            h.setNotaMedia(Math.round(soma * 10.0 / notas[i].length) / 10.0);
        }
    }

    // ---------------------------------------------------------------- passagens e passeios datados

    private record Rota(String emailFornecedor, TipoTransporte tipo, String origem, String destino, String hora,
                        int minutos, String preco, int vagas) {
    }

    private record Roteiro(String emailFornecedor, String titulo, String cidade, String categoria, String hora,
                           int horas, String preco, int vagas, double nota, int avaliacoes, String descricao) {
    }

    private static final List<Rota> ROTAS = List.of(
            new Rota(EMAIL_ONIBUS, TipoTransporte.RODOVIARIA, "Salvador", "Lençóis", "07:00", 390, "119.90", 40),
            new Rota(EMAIL_ONIBUS, TipoTransporte.RODOVIARIA, "Salvador", "Lençóis", "23:00", 390, "109.90", 40),
            new Rota(EMAIL_ONIBUS, TipoTransporte.RODOVIARIA, "Lençóis", "Salvador", "07:30", 390, "119.90", 40),
            new Rota(EMAIL_ONIBUS, TipoTransporte.RODOVIARIA, "Lençóis", "Salvador", "23:30", 390, "109.90", 40),
            new Rota(EMAIL_ONIBUS, TipoTransporte.RODOVIARIA, "Salvador", "Porto Seguro", "20:00", 660, "189.90", 40),
            new Rota(EMAIL_ONIBUS, TipoTransporte.RODOVIARIA, "Porto Seguro", "Salvador", "19:00", 660, "189.90", 40),
            new Rota(EMAIL_ONIBUS, TipoTransporte.RODOVIARIA, "Salvador", "Ilhéus", "08:00", 420, "139.90", 40),
            new Rota(EMAIL_ONIBUS, TipoTransporte.RODOVIARIA, "Ilhéus", "Salvador", "09:00", 420, "139.90", 40),
            new Rota(EMAIL_ONIBUS, TipoTransporte.RODOVIARIA, "Salvador", "Itacaré", "09:00", 450, "149.90", 40),
            new Rota(EMAIL_ONIBUS, TipoTransporte.RODOVIARIA, "Itacaré", "Salvador", "08:30", 450, "149.90", 40),
            new Rota(EMAIL_ONIBUS, TipoTransporte.RODOVIARIA, "Salvador", "Praia do Forte", "08:00", 100, "39.90", 40),
            new Rota(EMAIL_ONIBUS, TipoTransporte.RODOVIARIA, "Praia do Forte", "Salvador", "17:00", 100, "39.90", 40),
            new Rota(EMAIL_AEREO, TipoTransporte.AEREA, "Salvador", "Lençóis", "10:00", 65, "389.00", 60),
            new Rota(EMAIL_AEREO, TipoTransporte.AEREA, "Lençóis", "Salvador", "12:00", 65, "389.00", 60),
            new Rota(EMAIL_AEREO, TipoTransporte.AEREA, "Salvador", "Porto Seguro", "08:30", 70, "329.00", 120),
            new Rota(EMAIL_AEREO, TipoTransporte.AEREA, "Porto Seguro", "Salvador", "17:30", 70, "329.00", 120),
            new Rota(EMAIL_AEREO, TipoTransporte.AEREA, "Salvador", "Ilhéus", "14:00", 55, "279.00", 120),
            new Rota(EMAIL_AEREO, TipoTransporte.AEREA, "Ilhéus", "Salvador", "16:00", 55, "279.00", 120));

    private static final List<Roteiro> PASSEIOS = List.of(
            new Roteiro(EMAIL_GUIA, "Morro do Pai Inácio e Poço do Diabo", "Lençóis", "Natureza", "08:00", 8, "140.00", 12, 4.8, 31,
                    "Trilha leve até o Poço do Diabo, banho de cachoeira e pôr do sol no Morro do Pai Inácio. Inclui guia e transporte."),
            new Roteiro(EMAIL_GUIA, "Trilha da Cachoeira da Fumaça", "Lençóis", "Aventura", "07:30", 9, "160.00", 10, 4.9, 27,
                    "Trilha de 12 km (ida e volta) até o mirante de uma das cachoeiras mais altas do Brasil. Nível moderado."),
            new Roteiro(EMAIL_GUIA, "Gruta da Lapa Doce e Pratinha", "Lençóis", "Natureza", "08:30", 8, "150.00", 12, 4.7, 19,
                    "Caminhada dentro da gruta e flutuação nas águas cristalinas da Pratinha."),
            new Roteiro(EMAIL_GUIA, "Trilha da Cachoeira do Sossego", "Lençóis", "Aventura", "08:00", 7, "120.00", 10, 4.6, 14,
                    "Trilha pelo leito do rio até a Cachoeira do Sossego, com parada para banho no Ribeirão do Meio."),
            new Roteiro(EMAIL_GUIA, "Noite gastronômica em Lençóis", "Lençóis", "Gastronomia", "19:00", 3, "90.00", 16, 4.5, 9,
                    "Roteiro a pé por três restaurantes do centro, com pratos típicos da Chapada."),
            new Roteiro(EMAIL_PASSEIOS, "Pelourinho histórico a pé", "Salvador", "Cultura", "09:00", 3, "60.00", 20, 4.7, 44,
                    "Caminhada guiada pelas igrejas, largos e casarões do Centro Histórico."),
            new Roteiro(EMAIL_PASSEIOS, "Escuna pela Baía de Todos-os-Santos", "Salvador", "Praia", "08:30", 8, "130.00", 30, 4.5, 38,
                    "Dia de escuna com paradas na Ilha dos Frades e em Itaparica."),
            new Roteiro(EMAIL_PASSEIOS, "Rota do acarajé no Rio Vermelho", "Salvador", "Gastronomia", "18:00", 3, "85.00", 12, 4.8, 22,
                    "Degustação nos tabuleiros mais famosos do Rio Vermelho, com história da culinária baiana."),
            new Roteiro(EMAIL_PASSEIOS, "Arraial d'Ajuda e Trancoso", "Porto Seguro", "Praia", "08:00", 9, "150.00", 20, 4.7, 25,
                    "Travessia de balsa, praia em Arraial e fim de tarde no Quadrado de Trancoso."),
            new Roteiro(EMAIL_PASSEIOS, "Mergulho no Recife de Fora", "Porto Seguro", "Aventura", "07:00", 5, "180.00", 15, 4.8, 18,
                    "Passeio de barco até as piscinas naturais, com snorkel incluso."),
            new Roteiro(EMAIL_PASSEIOS, "Passarela do Descobrimento à noite", "Porto Seguro", "Vida noturna", "20:00", 3, "50.00", 30, 4.3, 11,
                    "Roteiro pelos bares e barracas de capeta da Passarela, com música ao vivo."),
            new Roteiro(EMAIL_PASSEIOS, "Fazenda de cacau e chocolate", "Ilhéus", "Gastronomia", "09:00", 5, "110.00", 15, 4.8, 16,
                    "Visita a uma fazenda centenária, da colheita do cacau à degustação de chocolate."),
            new Roteiro(EMAIL_PASSEIOS, "Centro histórico de Jorge Amado", "Ilhéus", "Cultura", "15:00", 3, "55.00", 20, 4.5, 12,
                    "Passeio a pé pelos cenários dos romances de Jorge Amado."),
            new Roteiro(EMAIL_PASSEIOS, "Trilha da Prainha", "Itacaré", "Natureza", "08:30", 5, "80.00", 12, 4.8, 20,
                    "Trilha pela Mata Atlântica até a Prainha, com tempo livre para banho."),
            new Roteiro(EMAIL_PASSEIOS, "Rafting no Rio de Contas", "Itacaré", "Aventura", "08:00", 6, "190.00", 12, 4.9, 15,
                    "Descida de bote pelas corredeiras do Rio de Contas, com instrutor e equipamento."),
            new Roteiro(EMAIL_PASSEIOS, "Projeto Tamar e vila de pescadores", "Praia do Forte", "Cultura", "10:00", 3, "65.00", 20, 4.6, 33,
                    "Visita ao centro de conservação de tartarugas marinhas e passeio pela vila."),
            new Roteiro(EMAIL_PASSEIOS, "Caiaque na Lagoa Timeantube", "Praia do Forte", "Natureza", "14:00", 3, "95.00", 10, 4.5, 8,
                    "Remada tranquila pela lagoa para observar aves, com guia local."));

    /** Gera as passagens e os passeios de cada um dos próximos 21 dias. */
    private List<Oferta> criarOfertasDatadas() {
        Map<String, Fornecedor> fornecedores = new HashMap<>();
        for (String email : List.of(EMAIL_ONIBUS, EMAIL_AEREO, EMAIL_GUIA, EMAIL_PASSEIOS)) {
            fornecedores.put(email, fornecedorDemo(email));
        }
        List<Oferta> novas = new ArrayList<>();
        LocalDate hoje = LocalDate.now();
        for (int i = 1; i <= DIAS_A_FRENTE; i++) {
            LocalDate dia = hoje.plusDays(i);
            for (Rota rota : ROTAS) {
                novas.add(passagem(fornecedores.get(rota.emailFornecedor()), rota, dia));
            }
            for (Roteiro roteiro : PASSEIOS) {
                novas.add(passeio(fornecedores.get(roteiro.emailFornecedor()), roteiro, dia));
            }
        }
        ofertas.saveAll(novas);
        ofertas.flush();
        return novas;
    }

    // ---------------------------------------------------------------- histórico para a demonstração

    /** Solicitações pendentes para os fornecedores, viagem passada da Ana e um itinerário pronto. */
    private void criarHistoricoDeExemplo(List<Oferta> datadas) {
        LocalDate hoje = LocalDate.now();
        Viajante ana = (Viajante) usuarios.findByEmailIgnoreCase("ana@viaja.com").orElseThrow();
        Viajante bruno = (Viajante) usuarios.findByEmailIgnoreCase("bruno@viaja.com").orElseThrow();
        Viajante carla = (Viajante) usuarios.findByEmailIgnoreCase("carla@viaja.com").orElseThrow();
        Viajante diego = (Viajante) usuarios.findByEmailIgnoreCase("diego@viaja.com").orElseThrow();
        Hospedagem serraViva = hospedagemPorTitulo("Pousada Serra Viva (quarto duplo)");
        Hospedagem mataAtlantica = hospedagemPorTitulo("Pousada Mata Atlântica");

        // Viagem passada da Ana a Itacaré: reserva confirmada e encerrada, pronta para ela avaliar (RF-13).
        reserva(ana, mataAtlantica, 2, hoje.minusDays(12).atTime(14, 0), hoje.minusDays(9).atTime(12, 0), 3,
                StatusReserva.CONFIRMADA, hoje.minusDays(20).atTime(10, 0));

        // Solicitações aguardando resposta, uma para cada tipo de fornecedor (RF-11).
        Passagem idaDiego = passagemDe(datadas, "Salvador", "Lençóis", hoje.plusDays(8), 7);
        Passeio paiInacio = passeioDe(datadas, "Morro do Pai Inácio e Poço do Diabo", hoje.plusDays(9));
        solicitar(bruno, serraViva, 2, hoje.plusDays(8).atTime(14, 0), hoje.plusDays(10).atTime(12, 0), 2);
        solicitar(diego, idaDiego, 1, idaDiego.getPartida(), idaDiego.getChegada(), null);
        solicitar(carla, paiInacio, 2, paiInacio.inicio(), paiInacio.fim(), null);

        // Itinerário da Ana, igual ao exemplo do planejamento: 4 dias em Lençóis, sem conflitos.
        LocalDate inicio = hoje.plusDays(10);
        Itinerario chapada = new Itinerario();
        chapada.setViajante(ana);
        chapada.setNome("Chapada Diamantina em 4 dias");
        chapada.setDataInicio(inicio);
        chapada.setDataFim(inicio.plusDays(3));
        chapada.setPessoas(1);
        Passagem ida = passagemDe(datadas, "Salvador", "Lençóis", inicio, 7);
        Passagem volta = passagemDe(datadas, "Lençóis", "Salvador", inicio.plusDays(3), 7);
        Passeio fumaca = passeioDe(datadas, "Trilha da Cachoeira da Fumaça", inicio.plusDays(2));
        Passeio paiInacioAna = passeioDe(datadas, "Morro do Pai Inácio e Poço do Diabo", inicio.plusDays(1));
        chapada.adicionarItem(item(ida, 1, ida.getPartida().toLocalTime(), null));
        chapada.adicionarItem(item(serraViva, 1, LocalTime.of(14, 0), 3));
        chapada.adicionarItem(item(paiInacioAna, 2, paiInacioAna.inicio().toLocalTime(), null));
        chapada.adicionarItem(item(fumaca, 3, fumaca.inicio().toLocalTime(), null));
        chapada.adicionarItem(item(volta, 4, volta.getPartida().toLocalTime(), null));
        chapada.recalcularCusto();
        itinerarios.save(chapada);
    }

    // ---------------------------------------------------------------- fábricas

    private <T extends Usuario> T usuario(T usuario, String nome, String email, int anoNascimento) {
        usuario.setNome(nome);
        usuario.setEmail(email);
        usuario.setSenhaHash(senhaHash);
        usuario.setDataNascimento(LocalDate.of(anoNascimento, 5, 14));
        usuario.setEmailConfirmado(true);
        return usuarios.save(usuario);
    }

    private Fornecedor fornecedor(String responsavel, String email, String razaoSocial, String cnpj, boolean aprovado) {
        Fornecedor fornecedor = new Fornecedor();
        fornecedor.setRazaoSocial(razaoSocial);
        fornecedor.setCnpj(cnpj);
        fornecedor.setAprovado(aprovado);
        return usuario(fornecedor, responsavel, email, 1980);
    }

    private Fornecedor fornecedorDemo(String email) {
        return usuarios.findByEmailIgnoreCase(email)
                .filter(Fornecedor.class::isInstance)
                .map(Fornecedor.class::cast)
                .orElseThrow();
    }

    private Hospedagem hospedagem(Fornecedor fornecedor, String titulo, String cidade, TipoHospedagem tipo,
                                  String diaria, int capacidade, int quartos, String descricao,
                                  String... comodidades) {
        Hospedagem h = new Hospedagem();
        h.setFornecedor(fornecedor);
        h.setTitulo(titulo);
        h.setCidade(cidade);
        h.setTipoHospedagem(tipo);
        h.setPreco(new BigDecimal(diaria));
        h.setCapacidade(capacidade);
        h.setVagas(quartos);
        h.setDescricao(descricao);
        h.setComodidades(new ArrayList<>(List.of(comodidades)));
        return h;
    }

    private Passagem passagem(Fornecedor fornecedor, Rota rota, LocalDate dia) {
        LocalDateTime partida = dia.atTime(LocalTime.parse(rota.hora()));
        boolean aerea = rota.tipo() == TipoTransporte.AEREA;
        String servico = aerea ? "voo direto" : (partida.getHour() >= 20 ? "ônibus leito" : "ônibus convencional");
        Passagem p = new Passagem();
        p.setFornecedor(fornecedor);
        p.setTitulo(rota.origem() + " → " + rota.destino() + " (" + servico + ")");
        p.setDescricao(aerea
                ? "Voo direto com uma bagagem de mão incluída."
                : "Ônibus com ar-condicionado, poltronas reclináveis e uma parada no caminho.");
        p.setOrigem(rota.origem());
        p.setDestino(rota.destino());
        p.setCidade(rota.destino());
        p.setTipoTransporte(rota.tipo());
        p.setPartida(partida);
        p.setChegada(partida.plusMinutes(rota.minutos()));
        p.setPreco(new BigDecimal(rota.preco()));
        p.setVagas(rota.vagas());
        return p;
    }

    private Passeio passeio(Fornecedor fornecedor, Roteiro roteiro, LocalDate dia) {
        Passeio p = new Passeio();
        p.setFornecedor(fornecedor);
        p.setTitulo(roteiro.titulo());
        p.setDescricao(roteiro.descricao());
        p.setCidade(roteiro.cidade());
        p.setCategoria(roteiro.categoria());
        p.setData(dia);
        p.setHorarioInicio(LocalTime.parse(roteiro.hora()));
        p.setDuracaoHoras(roteiro.horas());
        p.setPreco(new BigDecimal(roteiro.preco()));
        p.setVagas(roteiro.vagas());
        // Nota de demonstração do passeio (cada data é uma oferta nova, ainda sem avaliações próprias).
        p.setNotaMedia(roteiro.nota());
        p.setTotalAvaliacoes(roteiro.avaliacoes());
        return p;
    }

    private static final String[] ELOGIOS = {
            "Atendimento impecável e café da manhã farto.",
            "Localização perfeita, voltaria com certeza.",
            "Quarto limpo e equipe muito atenciosa.",
            "Lugar tranquilo, exatamente como nas fotos."
    };
    private static final String[] BONS = {
            "Muito bom, só o Wi-Fi que oscilou um pouco.",
            "Ótimo custo-benefício para a região.",
            "Gostei bastante, o chuveiro poderia ser mais forte."
    };
    private static final String[] MEDIANOS = {
            "Bom, mas o quarto era menor do que eu esperava.",
            "Atendeu, só achei barulhento à noite."
    };

    private void avaliar(Viajante autor, Hospedagem hospedagem, int diasAtras, int nota) {
        LocalDate checkout = LocalDate.now().minusDays(diasAtras);
        Reserva reserva = reserva(autor, hospedagem, 2, checkout.minusDays(3).atTime(14, 0), checkout.atTime(12, 0), 3,
                StatusReserva.CONFIRMADA, checkout.minusDays(15).atTime(9, 30));
        reserva.setAvaliada(true);

        String[] opcoes = nota >= 5 ? ELOGIOS : (nota == 4 ? BONS : MEDIANOS);
        Avaliacao avaliacao = new Avaliacao();
        avaliacao.setNota(nota);
        avaliacao.setComentario(opcoes[diasAtras % opcoes.length]);
        avaliacao.setData(checkout.plusDays(1));
        avaliacao.setViajante(autor);
        avaliacao.setOferta(hospedagem);
        avaliacao.setReserva(reserva);
        avaliacoes.save(avaliacao);
    }

    private Reserva reserva(Viajante viajante, Oferta oferta, int pessoas, LocalDateTime inicio, LocalDateTime fim,
                            Integer noites, StatusReserva status, LocalDateTime solicitadaEm) {
        Reserva reserva = new Reserva();
        reserva.setViajante(viajante);
        reserva.setOferta(oferta);
        reserva.setPessoas(pessoas);
        reserva.setQuantidade(oferta.unidadesPara(pessoas));
        reserva.setNoites(noites);
        reserva.setDataInicio(inicio);
        reserva.setDataFim(fim);
        reserva.setValorTotal(oferta.custoPara(pessoas, noites));
        reserva.setStatus(status);
        reserva.setDataSolicitacao(solicitadaEm);
        if (status != StatusReserva.SOLICITADA) {
            reserva.setDataResposta(solicitadaEm.plusHours(5));
        }
        return reservas.save(reserva);
    }

    private void solicitar(Viajante viajante, Oferta oferta, int pessoas, LocalDateTime inicio, LocalDateTime fim,
                           Integer noites) {
        reserva(viajante, oferta, pessoas, inicio, fim, noites, StatusReserva.SOLICITADA,
                LocalDateTime.now().minusHours(3));
        notificacoes.save(new Notificacao(oferta.getFornecedor(), TipoNotificacao.NOVA_SOLICITACAO,
                viajante.getNome() + " solicitou \"" + oferta.getTitulo() + "\" para " + pessoas
                        + (pessoas == 1 ? " pessoa" : " pessoas") + ". Responda em até 48 horas."));
    }

    private ItemItinerario item(Oferta oferta, int dia, LocalTime horario, Integer noites) {
        ItemItinerario item = new ItemItinerario();
        item.setOferta(oferta);
        item.setDia(dia);
        item.setHorario(horario);
        item.setNoites(noites);
        return item;
    }

    private Hospedagem hospedagemPorTitulo(String titulo) {
        return ofertas.hospedagensDisponiveis().stream()
                .filter(h -> h.getTitulo().equals(titulo))
                .findFirst()
                .orElseThrow();
    }

    private static Passagem passagemDe(List<Oferta> datadas, String origem, String destino, LocalDate dia, int hora) {
        return datadas.stream()
                .filter(Passagem.class::isInstance)
                .map(Passagem.class::cast)
                .filter(p -> p.getOrigem().equals(origem) && p.getDestino().equals(destino))
                .filter(p -> p.getPartida().toLocalDate().equals(dia) && p.getPartida().getHour() == hora)
                .findFirst()
                .orElseThrow();
    }

    private static Passeio passeioDe(List<Oferta> datadas, String titulo, LocalDate dia) {
        return datadas.stream()
                .filter(Passeio.class::isInstance)
                .map(Passeio.class::cast)
                .filter(p -> p.getTitulo().equals(titulo) && p.getData().equals(dia))
                .findFirst()
                .orElseThrow();
    }
}
