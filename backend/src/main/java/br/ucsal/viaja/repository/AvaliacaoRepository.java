package br.ucsal.viaja.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import br.ucsal.viaja.domain.Avaliacao;

public interface AvaliacaoRepository extends JpaRepository<Avaliacao, Long> {

    @Query("""
            select a from Avaliacao a join fetch a.viajante join fetch a.oferta o
            where o.id = :ofertaId order by a.data desc, a.id desc
            """)
    List<Avaliacao> daOferta(@Param("ofertaId") Long ofertaId);

    @Query("select a from Avaliacao a join fetch a.viajante join fetch a.oferta order by a.data desc, a.id desc")
    List<Avaliacao> todas();

    @Query("select avg(a.nota) from Avaliacao a where a.oferta.id = :ofertaId")
    Double mediaDaOferta(@Param("ofertaId") Long ofertaId);

    long countByOfertaId(Long ofertaId);
}
