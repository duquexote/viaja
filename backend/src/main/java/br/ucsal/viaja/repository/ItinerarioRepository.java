package br.ucsal.viaja.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import br.ucsal.viaja.domain.Itinerario;

public interface ItinerarioRepository extends JpaRepository<Itinerario, Long> {

    List<Itinerario> findByViajanteIdOrderByDataInicioAscIdAsc(Long viajanteId);

    /** Busca já restrita ao dono: um viajante nunca enxerga o itinerário de outro. */
    Optional<Itinerario> findByIdAndViajanteId(Long id, Long viajanteId);
}
