package br.ucsal.viaja.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.ucsal.viaja.domain.Administrador;
import br.ucsal.viaja.domain.Fornecedor;
import br.ucsal.viaja.domain.Oferta;
import br.ucsal.viaja.domain.Reserva;
import br.ucsal.viaja.domain.StatusReserva;
import br.ucsal.viaja.domain.TipoNotificacao;
import br.ucsal.viaja.domain.Usuario;
import br.ucsal.viaja.domain.Viajante;
import br.ucsal.viaja.dto.Requisicoes.PerfilUsuario;
import br.ucsal.viaja.dto.UsuarioDTO;
import br.ucsal.viaja.exception.NaoEncontradoException;
import br.ucsal.viaja.exception.RegraNegocioException;
import br.ucsal.viaja.repository.ItinerarioRepository;
import br.ucsal.viaja.repository.NotificacaoRepository;
import br.ucsal.viaja.repository.OfertaRepository;
import br.ucsal.viaja.repository.ReservaRepository;
import br.ucsal.viaja.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;

/** Edição de perfil e exclusão da própria conta (RF-02, RNF-04). */
@Service
@RequiredArgsConstructor
@Transactional
public class UsuarioService {

    private final UsuarioRepository usuarios;
    private final ItinerarioRepository itinerarios;
    private final ReservaRepository reservas;
    private final OfertaRepository ofertas;
    private final NotificacaoRepository notificacoes;
    private final NotificacaoService notificacaoService;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public UsuarioDTO obter(Long usuarioId) {
        return UsuarioDTO.de(buscar(usuarioId));
    }

    public UsuarioDTO atualizar(Long usuarioId, PerfilUsuario req) {
        Usuario usuario = buscar(usuarioId);
        usuario.setNome(req.nome().trim());
        usuario.setDataNascimento(req.dataNascimento());
        if (!usuario.maiorDeIdade(LocalDate.now())) {
            throw new RegraNegocioException("É preciso ter 18 anos ou mais para usar o ViaJá.");
        }
        if (usuario instanceof Viajante viajante && req.interesses() != null) {
            viajante.setInteresses(req.interesses().stream().filter(i -> !Texto.vazio(i)).map(String::trim).toList());
        }
        if (usuario instanceof Fornecedor fornecedor) {
            if (!Texto.vazio(req.razaoSocial())) {
                fornecedor.setRazaoSocial(req.razaoSocial().trim());
            }
            // Campo ausente (por exemplo, na troca de senha) não apaga o CNPJ já cadastrado.
            if (req.cnpj() != null) {
                fornecedor.setCnpj(req.cnpj().isBlank() ? null : req.cnpj().trim());
            }
        }
        if (!Texto.vazio(req.novaSenha())) {
            if (req.novaSenha().length() < 6 || req.novaSenha().length() > 72) {
                throw new RegraNegocioException("A nova senha deve ter de 6 a 72 caracteres.");
            }
            if (req.senhaAtual() == null || !passwordEncoder.matches(req.senhaAtual(), usuario.getSenhaHash())) {
                throw new RegraNegocioException("A senha atual não confere.");
            }
            usuario.setSenhaHash(passwordEncoder.encode(req.novaSenha()));
        }
        return UsuarioDTO.de(usuario);
    }

    /**
     * Exclusão de conta pedida pelo próprio usuário (LGPD). Os dados pessoais são apagados e a conta é
     * desativada; reservas e avaliações antigas ficam, sem identificação, para não quebrar o histórico
     * dos outros usuários.
     */
    public void excluirConta(Long usuarioId) {
        Usuario usuario = buscar(usuarioId);
        if (usuario instanceof Administrador && usuarios.administradores().size() <= 1) {
            throw new RegraNegocioException("Não é possível excluir o único administrador da plataforma.");
        }
        LocalDateTime agora = LocalDateTime.now();

        if (usuario instanceof Viajante viajante) {
            itinerarios.deleteAll(itinerarios.findByViajanteIdOrderByDataInicioAscIdAsc(usuarioId));
            for (Reserva reserva : reservas.doViajante(usuarioId)) {
                if (reserva.ativa()) {
                    if (reserva.getStatus() == StatusReserva.CONFIRMADA) {
                        reserva.getOferta().devolverVagas(reserva.getQuantidade());
                    }
                    reserva.setStatus(StatusReserva.CANCELADA);
                    reserva.setDataResposta(agora);
                }
            }
            viajante.setInteresses(List.of());
        }

        if (usuario instanceof Fornecedor fornecedor) {
            for (Oferta oferta : ofertas.doFornecedor(usuarioId)) {
                oferta.setAtiva(false);
            }
            for (Reserva reserva : reservas.doFornecedor(usuarioId)) {
                if (reserva.getStatus() == StatusReserva.SOLICITADA) {
                    reserva.recusar("O fornecedor encerrou a conta.");
                    notificacaoService.notificar(reserva.getViajante(), TipoNotificacao.RESERVA_RECUSADA,
                            "Sua solicitação para \"" + reserva.getOferta().getTitulo()
                                    + "\" foi recusada porque o fornecedor encerrou a conta.");
                }
            }
            fornecedor.setRazaoSocial(null);
            fornecedor.setCnpj(null);
        }

        notificacoes.apagarDoUsuario(usuarioId);
        usuario.setNome("Usuário removido");
        usuario.setEmail("removido-" + usuarioId + "@viaja.invalid");
        usuario.setSenhaHash(passwordEncoder.encode(UUID.randomUUID().toString()));
        usuario.setDataNascimento(null);
        usuario.setTokenConfirmacao(null);
        usuario.setAtivo(false);
    }

    private Usuario buscar(Long usuarioId) {
        return usuarios.findById(usuarioId)
                .filter(Usuario::isAtivo)
                .orElseThrow(() -> new NaoEncontradoException("Usuário não encontrado."));
    }
}
