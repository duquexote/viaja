package br.ucsal.viaja.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import org.junit.jupiter.api.Test;

import br.ucsal.viaja.domain.Hospedagem;
import br.ucsal.viaja.domain.ItemItinerario;
import br.ucsal.viaja.domain.Itinerario;
import br.ucsal.viaja.domain.Oferta;
import br.ucsal.viaja.domain.Passagem;
import br.ucsal.viaja.domain.Passeio;
import br.ucsal.viaja.domain.TipoTransporte;

/** Casos de teste de conflito de datas do itinerário (objetivo OE2 e regra RN-08). */
class ValidadorItinerarioTest {

    private static final LocalDate INICIO = LocalDate.of(2030, 12, 1);

    private final ValidadorItinerario validador = new ValidadorItinerario();

    @Test
    void itinerarioCoerenteNaoTemConflitos() {
        Itinerario it = itinerario(4);
        adicionar(it, onibus("Salvador", "Lençóis", INICIO.atTime(7, 0), INICIO.atTime(13, 30)), 1, null);
        adicionar(it, pousada("Lençóis"), 1, 3);
        adicionar(it, passeio("Lençóis", INICIO.plusDays(1)), 2, null);
        adicionar(it, onibus("Lençóis", "Salvador", INICIO.plusDays(3).atTime(7, 30), INICIO.plusDays(3).atTime(14, 0)), 4, null);

        assertThat(validador.validar(it)).isEmpty();
    }

    @Test
    void checkinUmDiaDepoisDaChegadaGeraConflito() {
        Itinerario it = itinerario(4);
        adicionar(it, onibus("Salvador", "Lençóis", INICIO.atTime(7, 0), INICIO.atTime(13, 30)), 1, null);
        adicionar(it, pousada("Lençóis"), 2, 2);

        List<String> conflitos = validador.validar(it);

        assertThat(conflitos).anyMatch(c -> c.contains("1 dia depois da chegada em Lençóis"));
    }

    @Test
    void passagemEmDiaDiferenteDaPartidaGeraConflito() {
        Itinerario it = itinerario(4);
        adicionar(it, onibus("Salvador", "Lençóis", INICIO.atTime(7, 0), INICIO.atTime(13, 30)), 2, null);

        assertThat(validador.validar(it)).anyMatch(c -> c.contains("parte em 01/12"));
    }

    @Test
    void passeioAntesDaChegadaGeraConflito() {
        Itinerario it = itinerario(4);
        adicionar(it, onibus("Salvador", "Lençóis", INICIO.atTime(7, 0), INICIO.atTime(13, 30)), 1, null);
        adicionar(it, passeio("Lençóis", INICIO), 1, null);

        assertThat(validador.validar(it)).anyMatch(c -> c.contains("começa antes da chegada em Lençóis"));
    }

    @Test
    void hospedagemAlemDoFimDoItinerarioGeraConflito() {
        Itinerario it = itinerario(3);
        adicionar(it, pousada("Lençóis"), 1, 5);

        assertThat(validador.validar(it)).anyMatch(c -> c.contains("depois do fim do itinerário"));
    }

    @Test
    void ofertaSemVagasGeraConflito() {
        Itinerario it = itinerario(2);
        Passeio lotado = passeio("Lençóis", INICIO);
        lotado.setVagas(0);
        adicionar(it, lotado, 1, null);

        assertThat(validador.validar(it)).anyMatch(c -> c.contains("não tem vagas suficientes"));
    }

    // ---------------------------------------------------------------- montagem dos cenários

    private Itinerario itinerario(int dias) {
        Itinerario it = new Itinerario();
        it.setNome("Teste");
        it.setDataInicio(INICIO);
        it.setDataFim(INICIO.plusDays(dias - 1L));
        it.setPessoas(1);
        return it;
    }

    private void adicionar(Itinerario it, Oferta oferta, int dia, Integer noites) {
        ItemItinerario item = new ItemItinerario();
        item.setOferta(oferta);
        item.setDia(dia);
        item.setNoites(noites);
        it.adicionarItem(item);
    }

    private Passagem onibus(String origem, String destino, LocalDateTime partida, LocalDateTime chegada) {
        Passagem p = new Passagem();
        p.setTitulo(origem + " → " + destino);
        p.setOrigem(origem);
        p.setDestino(destino);
        p.setCidade(destino);
        p.setTipoTransporte(TipoTransporte.RODOVIARIA);
        p.setPartida(partida);
        p.setChegada(chegada);
        p.setPreco(new BigDecimal("119.90"));
        p.setVagas(40);
        return p;
    }

    private Hospedagem pousada(String cidade) {
        Hospedagem h = new Hospedagem();
        h.setTitulo("Pousada de teste");
        h.setCidade(cidade);
        h.setCapacidade(2);
        h.setPreco(new BigDecimal("200.00"));
        h.setVagas(5);
        return h;
    }

    private Passeio passeio(String cidade, LocalDate data) {
        Passeio p = new Passeio();
        p.setTitulo("Passeio de teste");
        p.setCidade(cidade);
        p.setCategoria("Natureza");
        p.setData(data);
        p.setHorarioInicio(LocalTime.of(8, 0));
        p.setDuracaoHoras(8);
        p.setPreco(new BigDecimal("140.00"));
        p.setVagas(12);
        return p;
    }
}
