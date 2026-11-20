package br.ucsal.viaja.repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import br.ucsal.viaja.domain.Hospedagem;
import br.ucsal.viaja.domain.Oferta;
import br.ucsal.viaja.domain.Passagem;
import br.ucsal.viaja.domain.Passeio;

/**
 * As consultas "disponiveis" já aplicam o que vale para toda busca pública:
 * oferta ativa, fornecedor aprovado e não bloqueado, e data futura.
 */
public interface OfertaRepository extends JpaRepository<Oferta, Long> {

    @Query("""
            select p from Passagem p join fetch p.fornecedor f
            where p.ativa = true and f.ativo = true and f.aprovado = true and f.bloqueado = false
              and p.partida > :agora
            """)
    List<Passagem> passagensDisponiveis(@Param("agora") LocalDateTime agora);

    @Query("""
            select h from Hospedagem h join fetch h.fornecedor f
            where h.ativa = true and f.ativo = true and f.aprovado = true and f.bloqueado = false
            """)
    List<Hospedagem> hospedagensDisponiveis();

    @Query("""
            select p from Passeio p join fetch p.fornecedor f
            where p.ativa = true and f.ativo = true and f.aprovado = true and f.bloqueado = false
              and p.data >= :hoje
            """)
    List<Passeio> passeiosDisponiveis(@Param("hoje") LocalDate hoje);

    @Query("select o from Oferta o join fetch o.fornecedor where o.id = :id")
    java.util.Optional<Oferta> buscarComFornecedor(@Param("id") Long id);

    @Query("select o from Oferta o join fetch o.fornecedor where o.id in :ids")
    List<Oferta> buscarPorIds(@Param("ids") List<Long> ids);

    @Query("select o from Oferta o join fetch o.fornecedor f where f.id = :fornecedorId order by o.id desc")
    List<Oferta> doFornecedor(@Param("fornecedorId") Long fornecedorId);

    @Query("select distinct o.cidade from Oferta o where o.ativa = true order by o.cidade")
    List<String> cidades();

    @Query("select distinct p.origem from Passagem p where p.ativa = true order by p.origem")
    List<String> origens();

    @Query("select distinct p.destino from Passagem p where p.ativa = true order by p.destino")
    List<String> destinos();

    @Query("select distinct p.categoria from Passeio p where p.ativa = true order by p.categoria")
    List<String> categorias();

    @Query("select max(p.partida) from Passagem p")
    LocalDateTime ultimaPartida();

    long countByAtivaTrue();
}
