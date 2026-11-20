package br.ucsal.viaja.domain;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/** Guarda uma lista de textos (interesses, comodidades) em uma única coluna, separada por ponto e vírgula. */
@Converter
public class ListaTextoConverter implements AttributeConverter<List<String>, String> {

    @Override
    public String convertToDatabaseColumn(List<String> lista) {
        if (lista == null || lista.isEmpty()) {
            return null;
        }
        return String.join(";", lista.stream().map(String::trim).filter(s -> !s.isEmpty()).toList());
    }

    @Override
    public List<String> convertToEntityAttribute(String coluna) {
        if (coluna == null || coluna.isBlank()) {
            return new ArrayList<>();
        }
        return new ArrayList<>(Arrays.asList(coluna.split(";")));
    }
}
