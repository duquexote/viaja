package br.ucsal.viaja.service;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.text.NumberFormat;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/** Utilitários de texto usados nas buscas e nas mensagens para o usuário. */
public final class Texto {

    public static final DateTimeFormatter DIA_MES = DateTimeFormatter.ofPattern("dd/MM");
    public static final DateTimeFormatter DIA_MES_HORA = DateTimeFormatter.ofPattern("dd/MM 'às' HH:mm");

    private static final Locale BRASIL = Locale.forLanguageTag("pt-BR");

    private Texto() {
    }

    public static boolean vazio(String texto) {
        return texto == null || texto.isBlank();
    }

    /** Minúsculas e sem acentos, para comparar "Lençóis" com "lencois". */
    public static String normalizar(String texto) {
        if (texto == null) {
            return "";
        }
        String semAcento = Normalizer.normalize(texto.trim().toLowerCase(BRASIL), Normalizer.Form.NFD);
        return semAcento.replaceAll("\\p{M}", "");
    }

    public static boolean igual(String a, String b) {
        return normalizar(a).equals(normalizar(b));
    }

    public static boolean contem(String texto, String trecho) {
        return normalizar(texto).contains(normalizar(trecho));
    }

    /** Valor em Reais (RN-05), por exemplo "R$ 1.500,00". */
    public static String reais(BigDecimal valor) {
        return NumberFormat.getCurrencyInstance(BRASIL).format(valor).replace(' ', ' ');
    }
}
