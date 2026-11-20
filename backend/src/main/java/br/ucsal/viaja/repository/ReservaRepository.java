package br.ucsal.viaja.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import br.ucsal.viaja.domain.Reserva;
import br.ucsal.viaja.domain.StatusReserva;

public interface ReservaRepository extends JpaRepository<Reserva, Long> {

    @Query("""
            select r from Reserva r join fetch r.oferta o join fetch o.fornecedor join fetch r.viajante v
            where v.id = :viajanteId order by r.dataSolicitacao desc, r.id desc
            """)
    List<Reserva> doViajante(@Param("viajanteId") Long viajanteId);

    @Query("""
            select r from Reserva r join fetch r.oferta o join fetch o.fornecedor f join fetch r.viajante
            where f.id = :fornecedorId order by r.dataSolicitacao desc, r.id desc
            """)
    List<Reserva> doFornecedor(@Param("fornecedorId") Long fornecedorId);

    List<Reserva> findByStatusAndDataSolicitacaoBefore(StatusReserva status, LocalDateTime limite);

    @Query("""
            select r from Reserva r
            where r.status = br.ucsal.viaja.domain.StatusReserva.CONFIRMADA and r.lembreteEnviado = false
              and r.dataInicio between :de and :ate
            """)
    List<Reserva> confirmadasSemLembrete(@Param("de") LocalDateTime de, @Param("ate") LocalDateTime ate);

    long countByStatus(StatusReserva status);
}
