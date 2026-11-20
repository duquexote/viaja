package br.ucsal.viaja.repository;

import java.time.LocalDateTime;

import org.springframework.data.jpa.repository.JpaRepository;

import br.ucsal.viaja.domain.GeracaoRoteiro;

public interface GeracaoRoteiroRepository extends JpaRepository<GeracaoRoteiro, Long> {

    long countByUsuarioIdAndCriadaEmGreaterThanEqual(Long usuarioId, LocalDateTime inicio);
}
