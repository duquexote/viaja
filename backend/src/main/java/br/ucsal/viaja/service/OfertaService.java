package br.ucsal.viaja.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.TreeSet;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.ucsal.viaja.domain.Fornecedor;
import br.ucsal.viaja.domain.Hospedagem;
import br.ucsal.viaja.domain.Oferta;
import br.ucsal.viaja.domain.Passagem;
import br.ucsal.viaja.domain.Passeio;
import br.ucsal.viaja.domain.TipoHospedagem;
import br.ucsal.viaja.domain.TipoOferta;
import br.ucsal.viaja.domain.TipoTransporte;
import br.ucsal.viaja.dto.OfertaDTO;
import br.ucsal.viaja.dto.Requisicoes.OfertaForm;
import br.ucsal.viaja.dto.Requisicoes.Opcoes;
import br.ucsal.viaja.exception.AcessoNegadoException;
import br.ucsal.viaja.exception.NaoEncontradoException;
import br.ucsal.viaja.exception.RegraNegocioException;
import br.ucsal.viaja.repository.OfertaRepository;
import br.ucsal.viaja.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;

/**
 * Buscas públicas com filtros (RF-04, RF-05, RF-06), comparação (RF-07) e o cadastro de ofertas
 * pelo fornecedor (RF-03). A base do MVP é pequena, então os filtros opcionais são aplicados em memória
 * sobre as ofertas disponíveis, o que mantém as respostas bem abaixo dos 3 s do RNF-01.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class OfertaService {

    public static final int MAXIMO_COMPARACAO = 4;
    private static final int LIMITE_RESULTADOS = 60;

    public static final List<String> CATEGORIAS =
            List.of("Natureza", "Aventura", "Cultura", "Gastronomia", "Praia", "Vida noturna");
    public static final List<String> COMODIDADES = List.of("Wi-Fi", "Café da manhã", "Piscina", "Ar-condicionado",
            "Estacionamento", "Cozinha", "Pet friendly");
    public static final List<String> INTERESSES = List.of("Natureza", "Trilhas", "Cachoeiras", "Praia", "Cultura",
            "Gastronomia", "Aventura", "Vida noturna");

    private final OfertaRepository ofertas;
    private final UsuarioRepository usuarios;

    // ---------------------------------------------------------------- buscas públicas

    @Transactional(readOnly = true)
    public Opcoes opcoes() {
        TreeSet<String> categorias = new TreeSet<>(CATEGORIAS);
        categorias.addAll(ofertas.categorias());
        return new Opcoes(ofertas.cidades(), ofertas.origens(), ofertas.destinos(), List.copyOf(categorias),
                COMODIDADES, Arrays.stream(TipoHospedagem.values()).map(Enum::name).toList(), INTERESSES);
    }

    /** RF-04: passagens por origem, destino, data e passageiros, com filtros de preço, horário e tipo. */
    @Transactional(readOnly = true)
    public List<OfertaDTO> buscarPassagens(String origem, String destino, LocalDate data, Integer passageiros,
                                           BigDecimal precoMax, TipoTransporte tipo, String horario, String ordenar) {
        int assentos = passageiros == null || passageiros < 1 ? 1 : passageiros;
        Comparator<Passagem> ordem = "duracao".equalsIgnoreCase(ordenar)
                ? Comparator.comparingLong(Passagem::duracaoMinutos).thenComparing(Passagem::getPreco)
                : Comparator.comparing(Passagem::getPreco).thenComparing(Passagem::getPartida);
        return ofertas.passagensDisponiveis(LocalDateTime.now()).stream()
                .filter(p -> Texto.vazio(origem) || Texto.igual(p.getOrigem(), origem))
                .filter(p -> Texto.vazio(destino) || Texto.igual(p.getDestino(), destino))
                .filter(p -> data == null || p.getPartida().toLocalDate().equals(data))
                .filter(p -> p.getVagas() >= assentos)
                .filter(p -> precoMax == null || p.getPreco().compareTo(precoMax) <= 0)
                .filter(p -> tipo == null || p.getTipoTransporte() == tipo)
                .filter(p -> naFaixaDeHorario(p.getPartida().getHour(), horario))
                .sorted(ordem.thenComparing(Passagem::getPartida))
                .limit(LIMITE_RESULTADOS)
                .map(OfertaDTO::de)
                .toList();
    }

    /** RF-05: hospedagens por cidade, período e hóspedes, com filtros de preço, tipo, nota e comodidades. */
    @Transactional(readOnly = true)
    public List<OfertaDTO> buscarHospedagens(String cidade, LocalDate checkin, LocalDate checkout, Integer hospedes,
                                             BigDecimal precoMax, TipoHospedagem tipo, Double notaMin,
                                             List<String> comodidades, String ordenar) {
        if (checkin != null && checkout != null && !checkout.isAfter(checkin)) {
            throw new RegraNegocioException("O check-out precisa ser depois do check-in.");
        }
        int pessoas = hospedes == null || hospedes < 1 ? 1 : hospedes;
        List<String> exigidas = comodidades == null ? List.of()
                : comodidades.stream().filter(c -> !Texto.vazio(c)).map(Texto::normalizar).toList();
        Comparator<Hospedagem> ordem = "nota".equalsIgnoreCase(ordenar)
                ? Comparator.comparingDouble(Hospedagem::getNotaMedia).reversed().thenComparing(Hospedagem::getPreco)
                : Comparator.comparing(Hospedagem::getPreco);
        return ofertas.hospedagensDisponiveis().stream()
                .filter(h -> Texto.vazio(cidade) || Texto.igual(h.getCidade(), cidade))
                .filter(h -> h.getVagas() >= h.unidadesPara(pessoas))
                .filter(h -> precoMax == null || h.getPreco().compareTo(precoMax) <= 0)
                .filter(h -> tipo == null || h.getTipoHospedagem() == tipo)
                .filter(h -> notaMin == null || h.getNotaMedia() >= notaMin)
                .filter(h -> h.getComodidades().stream().map(Texto::normalizar).toList().containsAll(exigidas))
                .sorted(ordem.thenComparing(Hospedagem::getTitulo))
                .limit(LIMITE_RESULTADOS)
                .map(OfertaDTO::de)
                .toList();
    }

    /** RF-06: passeios por cidade e data (ou período), com filtro de preço e categoria. */
    @Transactional(readOnly = true)
    public List<OfertaDTO> buscarPasseios(String cidade, LocalDate data, LocalDate dataFim, BigDecimal precoMax,
                                          String categoria, String ordenar) {
        LocalDate ate = dataFim != null ? dataFim : data;
        Comparator<Passeio> ordem;
        if ("nota".equalsIgnoreCase(ordenar)) {
            ordem = Comparator.comparingDouble(Passeio::getNotaMedia).reversed().thenComparing(Passeio::getPreco);
        } else if ("data".equalsIgnoreCase(ordenar)) {
            ordem = Comparator.comparing(Passeio::inicio);
        } else {
            ordem = Comparator.comparing(Passeio::getPreco).thenComparing(Passeio::inicio);
        }
        return ofertas.passeiosDisponiveis(LocalDate.now()).stream()
                .filter(p -> p.getVagas() > 0)
                .filter(p -> Texto.vazio(cidade) || Texto.igual(p.getCidade(), cidade))
                .filter(p -> data == null || !p.getData().isBefore(data))
                .filter(p -> ate == null || !p.getData().isAfter(ate))
                .filter(p -> precoMax == null || p.getPreco().compareTo(precoMax) <= 0)
                .filter(p -> Texto.vazio(categoria) || Texto.igual(p.getCategoria(), categoria))
                .sorted(ordem.thenComparing(Passeio::inicio))
                .limit(LIMITE_RESULTADOS)
                .map(OfertaDTO::de)
                .toList();
    }

    /** RF-07 e RN-10: de 2 a 4 ofertas, todas do mesmo tipo. */
    @Transactional(readOnly = true)
    public List<OfertaDTO> comparar(List<Long> ids) {
        List<Long> unicos = ids == null ? List.of() : ids.stream().distinct().toList();
        if (unicos.size() < 2 || unicos.size() > MAXIMO_COMPARACAO) {
            throw new RegraNegocioException("A comparação aceita de 2 a " + MAXIMO_COMPARACAO + " ofertas.");
        }
        List<Oferta> encontradas = ofertas.buscarPorIds(unicos);
        if (encontradas.size() != unicos.size()) {
            throw new NaoEncontradoException("Uma das ofertas escolhidas não existe mais.");
        }
        TipoOferta tipo = encontradas.get(0).getTipo();
        if (encontradas.stream().anyMatch(o -> o.getTipo() != tipo)) {
            throw new RegraNegocioException("Só é possível comparar ofertas do mesmo tipo.");
        }
        // Mantém a ordem em que o viajante selecionou.
        return unicos.stream()
                .map(id -> encontradas.stream().filter(o -> o.getId().equals(id)).findFirst().orElseThrow())
                .map(OfertaDTO::de)
                .toList();
    }

    @Transactional(readOnly = true)
    public OfertaDTO detalhar(Long id) {
        return OfertaDTO.de(buscar(id));
    }

    // ---------------------------------------------------------------- painel do fornecedor (RF-03)

    @Transactional(readOnly = true)
    public List<OfertaDTO> listarDoFornecedor(Long fornecedorId) {
        return ofertas.doFornecedor(fornecedorId).stream().map(OfertaDTO::de).toList();
    }

    public OfertaDTO criar(Long fornecedorId, OfertaForm form) {
        Fornecedor fornecedor = fornecedorAutorizado(fornecedorId);
        Oferta oferta = switch (form.tipo()) {
            case PASSAGEM -> new Passagem();
            case HOSPEDAGEM -> new Hospedagem();
            case PASSEIO -> new Passeio();
        };
        oferta.setFornecedor(fornecedor);
        preencher(oferta, form, true);
        return OfertaDTO.de(ofertas.save(oferta));
    }

    public OfertaDTO atualizar(Long fornecedorId, Long ofertaId, OfertaForm form) {
        fornecedorAutorizado(fornecedorId);
        Oferta oferta = buscarDoFornecedor(fornecedorId, ofertaId);
        if (oferta.getTipo() != form.tipo()) {
            throw new RegraNegocioException("O tipo da oferta não pode ser alterado.");
        }
        preencher(oferta, form, false);
        return OfertaDTO.de(oferta);
    }

    public OfertaDTO alterarAtiva(Long fornecedorId, Long ofertaId, boolean ativa) {
        if (ativa) {
            fornecedorAutorizado(fornecedorId);
        }
        Oferta oferta = buscarDoFornecedor(fornecedorId, ofertaId);
        oferta.setAtiva(ativa);
        return OfertaDTO.de(oferta);
    }

    // ---------------------------------------------------------------- apoio

    public Oferta buscar(Long id) {
        return ofertas.buscarComFornecedor(id)
                .orElseThrow(() -> new NaoEncontradoException("Oferta não encontrada."));
    }

    private Oferta buscarDoFornecedor(Long fornecedorId, Long ofertaId) {
        Oferta oferta = buscar(ofertaId);
        if (!oferta.getFornecedor().getId().equals(fornecedorId)) {
            throw new NaoEncontradoException("Oferta não encontrada.");
        }
        return oferta;
    }

    /** RN-06: fornecedor só publica depois de aprovado pelo administrador. */
    private Fornecedor fornecedorAutorizado(Long fornecedorId) {
        Fornecedor fornecedor = usuarios.findById(fornecedorId)
                .filter(u -> u instanceof Fornecedor)
                .map(u -> (Fornecedor) u)
                .orElseThrow(() -> new NaoEncontradoException("Fornecedor não encontrado."));
        if (fornecedor.isBloqueado()) {
            throw new AcessoNegadoException("Seu cadastro está bloqueado. Fale com o administrador.");
        }
        if (!fornecedor.isAprovado()) {
            throw new AcessoNegadoException("Seu cadastro ainda aguarda a aprovação do administrador.");
        }
        return fornecedor;
    }

    private void preencher(Oferta oferta, OfertaForm form, boolean nova) {
        oferta.setTitulo(form.titulo().trim());
        oferta.setDescricao(Texto.vazio(form.descricao()) ? null : form.descricao().trim());
        oferta.setPreco(form.preco());
        oferta.setVagas(form.vagas());
        oferta.setFotoUrl(Texto.vazio(form.fotoUrl()) ? null : form.fotoUrl().trim());

        if (oferta instanceof Passagem passagem) {
            exigir(!Texto.vazio(form.origem()) && !Texto.vazio(form.destino()), "Informe a origem e o destino.");
            exigir(!Texto.igual(form.origem(), form.destino()), "Origem e destino precisam ser diferentes.");
            exigir(form.tipoTransporte() != null, "Informe se a passagem é aérea ou rodoviária.");
            exigir(form.partida() != null && form.chegada() != null, "Informe a partida e a chegada.");
            exigir(form.chegada().isAfter(form.partida()), "A chegada precisa ser depois da partida.");
            exigir(!nova || form.partida().isAfter(LocalDateTime.now()), "A partida precisa ser uma data futura.");
            passagem.setOrigem(form.origem().trim());
            passagem.setDestino(form.destino().trim());
            passagem.setTipoTransporte(form.tipoTransporte());
            passagem.setPartida(form.partida());
            passagem.setChegada(form.chegada());
            passagem.setCidade(passagem.getDestino());
        } else if (oferta instanceof Hospedagem hospedagem) {
            exigir(!Texto.vazio(form.cidade()), "Informe a cidade.");
            exigir(form.tipoHospedagem() != null, "Informe o tipo de hospedagem.");
            exigir(form.capacidade() != null && form.capacidade() >= 1, "Informe quantos hóspedes cabem por quarto.");
            hospedagem.setCidade(form.cidade().trim());
            hospedagem.setTipoHospedagem(form.tipoHospedagem());
            hospedagem.setCapacidade(form.capacidade());
            hospedagem.setComodidades(form.comodidades() == null ? new ArrayList<>()
                    : new ArrayList<>(form.comodidades().stream().filter(c -> !Texto.vazio(c)).map(String::trim)
                            .distinct().toList()));
        } else if (oferta instanceof Passeio passeio) {
            exigir(!Texto.vazio(form.cidade()), "Informe a cidade.");
            exigir(!Texto.vazio(form.categoria()), "Informe a categoria do passeio.");
            exigir(form.data() != null && form.horarioInicio() != null, "Informe a data e o horário do passeio.");
            exigir(form.duracaoHoras() != null && form.duracaoHoras() >= 1 && form.duracaoHoras() <= 24,
                    "Informe a duração em horas (de 1 a 24).");
            exigir(!nova || !form.data().isBefore(LocalDate.now()), "A data do passeio já passou.");
            passeio.setCidade(form.cidade().trim());
            passeio.setCategoria(form.categoria().trim());
            passeio.setData(form.data());
            passeio.setHorarioInicio(form.horarioInicio());
            passeio.setDuracaoHoras(form.duracaoHoras());
        }
    }

    private static void exigir(boolean condicao, String mensagem) {
        if (!condicao) {
            throw new RegraNegocioException(mensagem);
        }
    }

    /** Manhã: 05h a 12h. Tarde: 12h a 18h. Noite: 18h a 05h. */
    private static boolean naFaixaDeHorario(int hora, String faixa) {
        if (Texto.vazio(faixa)) {
            return true;
        }
        return switch (faixa.trim().toUpperCase()) {
            case "MANHA" -> hora >= 5 && hora < 12;
            case "TARDE" -> hora >= 12 && hora < 18;
            case "NOITE" -> hora >= 18 || hora < 5;
            default -> true;
        };
    }
}
