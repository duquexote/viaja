package br.ucsal.viaja;

import java.util.TimeZone;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Ponto de entrada da API do ViaJá.
 * A autenticação é feita por JWT (ver pacote security), por isso o usuário padrão do Spring Security é desligado.
 */
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
@EnableScheduling
public class ViajaApplication {

    public static void main(String[] args) {
        // Datas e horários das ofertas são sempre no horário da Bahia, onde quer que a API rode.
        TimeZone.setDefault(TimeZone.getTimeZone("America/Bahia"));
        SpringApplication.run(ViajaApplication.class, args);
    }
}
