package br.ucsal.viaja.service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.stereotype.Component;

import br.ucsal.viaja.domain.Hospedagem;
import br.ucsal.viaja.domain.ItemItinerario;
import br.ucsal.viaja.domain.Itinerario;
import br.ucsal.viaja.domain.Oferta;
import br.ucsal.viaja.domain.Passagem;
import br.ucsal.viaja.domain.Passeio;

/**
 * Validação de datas e vagas do itinerário (RF-08). Cada problema vira uma mensagem de conflito;
 * enquanto houver conflito o viajante não consegue enviar as solicitações de reserva (RN-08).
 *
 * Verifica: item fora do período, item em dia diferente da data da oferta, oferta sem vagas,
 * check-in e check-out que não batem com a chegada e a saída do transporte, passeio antes da
 * chegada ou depois da saída, e hospedagens sobrepostas.
 */
@Component
public class ValidadorItinerario {

    public List<String> validar(Itinerario it) {
        Set<String> conflitos = new LinkedHashSet<>();
        int totalDias = it.totalDias();

        List<Passagem> passagens = it.getItens().stream()
                .map(ItemItinerario::getOferta)
                .filter(Passagem.class::isInstance)
                .map(Passagem.class::cast)
                .toList();
        List<Estadia> estadias = new ArrayList<>();

        for (ItemItinerario item : it.getItens()) {
            Oferta oferta = item.getOferta();
            String nome = "\"" + oferta.getTitulo() + "\"";

            if (item.getDia() < 1 || item.getDia() > totalDias) {
                conflitos.add(nome + " está fora do período do itinerário.");
                continue;
            }
            LocalDate dataDoItem = it.dataDoDia(item.getDia());

            // Vagas só importam para o que ainda não foi reservado (RN-02).
            if (!item.temReservaAtiva()) {
                int unidades = oferta.unidadesPara(it.getPessoas());
                if (!oferta.isAtiva()) {
                    conflitos.add(nome + " não está mais disponível.");
                } else if (oferta.getVagas() < unidades) {
                    conflitos.add(nome + " não tem vagas suficientes (restam " + oferta.getVagas() + ").");
                }
            }

            if (oferta instanceof Passagem passagem) {
                LocalDate partida = passagem.getPartida().toLocalDate();
                if (!partida.equals(dataDoItem)) {
                    conflitos.add("A passagem " + nome + " parte em " + dia(partida) + ", mas está no dia "
                            + item.getDia() + " (" + dia(dataDoItem) + ") do itinerário.");
                }
            } else if (oferta instanceof Passeio passeio) {
                if (!passeio.getData().equals(dataDoItem)) {
                    conflitos.add("O passeio " + nome + " acontece em " + dia(passeio.getData())
                            + ", mas está no dia " + item.getDia() + " (" + dia(dataDoItem) + ") do itinerário.");
                }
                validarPasseio(passeio, nome, passagens, conflitos);
            } else if (oferta instanceof Hospedagem hospedagem) {
                int noites = item.getNoites() == null || item.getNoites() < 1 ? 1 : item.getNoites();
                Estadia estadia = new Estadia(hospedagem, nome, dataDoItem, dataDoItem.plusDays(noites));
                estadias.add(estadia);
                if (estadia.checkout().isAfter(it.getDataFim())) {
                    conflitos.add("A hospedagem " + nome + " termina em " + dia(estadia.checkout())
                            + ", depois do fim do itinerário (" + dia(it.getDataFim()) + ").");
                }
                validarEstadia(estadia, passagens, conflitos);
            }
        }

        for (int i = 0; i < estadias.size(); i++) {
            for (int j = i + 1; j < estadias.size(); j++) {
                Estadia a = estadias.get(i);
                Estadia b = estadias.get(j);
                if (a.checkin().isBefore(b.checkout()) && b.checkin().isBefore(a.checkout())) {
                    conflitos.add("As hospedagens " + a.nome() + " e " + b.nome() + " ocupam as mesmas noites.");
                }
            }
        }
        return List.copyOf(conflitos);
    }

    /** O check-in precisa coincidir com a chegada na cidade e o check-out com a saída dela. */
    private void validarEstadia(Estadia estadia, List<Passagem> passagens, Set<String> conflitos) {
        String cidade = estadia.hospedagem().getCidade();

        ultimaChegadaAte(passagens, cidade, estadia.checkout()).ifPresent(chegada -> {
            LocalDate dataChegada = chegada.getChegada().toLocalDate();
            long diferenca = ChronoUnit.DAYS.between(dataChegada, estadia.checkin());
            if (diferenca > 0) {
                conflitos.add("O check-in em " + estadia.nome() + " (" + dia(estadia.checkin()) + ") é "
                        + diferenca + (diferenca == 1 ? " dia" : " dias") + " depois da chegada em " + cidade
                        + " (" + dia(dataChegada) + ").");
            } else if (diferenca < 0) {
                conflitos.add("O check-in em " + estadia.nome() + " (" + dia(estadia.checkin())
                        + ") é antes da chegada em " + cidade + " (" + dia(dataChegada) + ").");
            }
        });

        primeiraSaidaApos(passagens, cidade, estadia.checkin()).ifPresent(saida -> {
            LocalDate dataSaida = saida.getPartida().toLocalDate();
            if (!estadia.checkout().equals(dataSaida)) {
                conflitos.add("O check-out de " + estadia.nome() + " (" + dia(estadia.checkout())
                        + ") não coincide com a saída de " + cidade + " (" + dia(dataSaida) + ").");
            }
        });
    }

    /** O passeio precisa caber entre a chegada na cidade e a saída dela. */
    private void validarPasseio(Passeio passeio, String nome, List<Passagem> passagens, Set<String> conflitos) {
        String cidade = passeio.getCidade();
        List<Passagem> chegadas = passagens.stream().filter(p -> Texto.igual(p.getDestino(), cidade))
                .sorted(Comparator.comparing(Passagem::getChegada)).toList();
        List<Passagem> saidas = passagens.stream().filter(p -> Texto.igual(p.getOrigem(), cidade))
                .sorted(Comparator.comparing(Passagem::getPartida)).toList();

        // Última chegada na cidade antes do fim do passeio e primeira saída depois do início dele.
        Optional<Passagem> chegada = chegadas.stream()
                .filter(p -> !p.getChegada().isAfter(passeio.fim()))
                .reduce((primeira, segunda) -> segunda);
        Optional<Passagem> saida = saidas.stream()
                .filter(p -> !p.getPartida().isBefore(passeio.inicio()))
                .findFirst();

        if (chegada.isPresent() && passeio.inicio().isBefore(chegada.get().getChegada())) {
            conflitos.add("O passeio " + nome + " começa antes da chegada em " + cidade + " ("
                    + chegada.get().getChegada().format(Texto.DIA_MES_HORA) + ").");
        } else if (chegada.isEmpty() && !chegadas.isEmpty()) {
            // Só há chegadas depois do passeio: vale apenas se o viajante parte dessa cidade antes de voltar.
            boolean cidadeDeOrigem = saida.isPresent()
                    && saida.get().getPartida().isBefore(chegadas.get(0).getChegada());
            if (!cidadeDeOrigem) {
                conflitos.add("O passeio " + nome + " acontece antes da chegada em " + cidade + " ("
                        + chegadas.get(0).getChegada().format(Texto.DIA_MES_HORA) + ").");
            }
        }

        if (saida.isPresent() && passeio.fim().isAfter(saida.get().getPartida())) {
            conflitos.add("O passeio " + nome + " termina depois da saída de " + cidade + " ("
                    + saida.get().getPartida().format(Texto.DIA_MES_HORA) + ").");
        } else if (saida.isEmpty() && !saidas.isEmpty()) {
            // Todas as saídas são anteriores ao passeio: só vale se o viajante voltou para a cidade depois.
            Passagem ultimaSaida = saidas.get(saidas.size() - 1);
            boolean voltou = chegada.isPresent() && chegada.get().getChegada().isAfter(ultimaSaida.getPartida());
            if (!voltou) {
                conflitos.add("O passeio " + nome + " acontece depois da saída de " + cidade + " ("
                        + ultimaSaida.getPartida().format(Texto.DIA_MES_HORA) + ").");
            }
        }
    }

    private Optional<Passagem> ultimaChegadaAte(List<Passagem> passagens, String cidade, LocalDate limite) {
        return passagens.stream()
                .filter(p -> Texto.igual(p.getDestino(), cidade))
                .filter(p -> !p.getChegada().toLocalDate().isAfter(limite))
                .max(Comparator.comparing(Passagem::getChegada));
    }

    private Optional<Passagem> primeiraSaidaApos(List<Passagem> passagens, String cidade, LocalDate inicio) {
        return passagens.stream()
                .filter(p -> Texto.igual(p.getOrigem(), cidade))
                .filter(p -> !p.getPartida().toLocalDate().isBefore(inicio))
                .min(Comparator.comparing(Passagem::getPartida));
    }

    private static String dia(LocalDate data) {
        return data.format(Texto.DIA_MES);
    }

    private record Estadia(Hospedagem hospedagem, String nome, LocalDate checkin, LocalDate checkout) {
    }
}
