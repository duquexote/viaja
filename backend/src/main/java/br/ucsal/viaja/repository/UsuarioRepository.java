package br.ucsal.viaja.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import br.ucsal.viaja.domain.Administrador;
import br.ucsal.viaja.domain.Fornecedor;
import br.ucsal.viaja.domain.Usuario;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    Optional<Usuario> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    Optional<Usuario> findByTokenConfirmacao(String tokenConfirmacao);

    long countByAtivoTrue();

    @Query("select f from Fornecedor f where f.ativo = true order by f.aprovado asc, f.criadoEm desc")
    List<Fornecedor> fornecedores();

    @Query("select a from Administrador a where a.ativo = true")
    List<Administrador> administradores();

    @Query("select count(v) from Viajante v where v.ativo = true")
    long totalViajantes();

    @Query("select count(f) from Fornecedor f where f.ativo = true")
    long totalFornecedores();

    @Query("select count(f) from Fornecedor f where f.ativo = true and f.aprovado = false")
    long fornecedoresPendentes();
}
