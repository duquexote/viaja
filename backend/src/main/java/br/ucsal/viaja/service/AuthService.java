package br.ucsal.viaja.service;

import java.time.LocalDate;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.ucsal.viaja.domain.Fornecedor;
import br.ucsal.viaja.domain.Perfil;
import br.ucsal.viaja.domain.Usuario;
import br.ucsal.viaja.domain.Viajante;
import br.ucsal.viaja.dto.Requisicoes.Login;
import br.ucsal.viaja.dto.Requisicoes.LoginResposta;
import br.ucsal.viaja.dto.Requisicoes.Registro;
import br.ucsal.viaja.dto.Requisicoes.RegistroResposta;
import br.ucsal.viaja.dto.UsuarioDTO;
import br.ucsal.viaja.exception.CredenciaisInvalidasException;
import br.ucsal.viaja.exception.RegraNegocioException;
import br.ucsal.viaja.repository.UsuarioRepository;
import br.ucsal.viaja.security.JwtService;
import lombok.RequiredArgsConstructor;

/** Cadastro com confirmação de e-mail e login por JWT (RF-01). */
@Service
@RequiredArgsConstructor
@Transactional
public class AuthService {

    private final UsuarioRepository usuarios;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final EmailService email;

    @Value("${viaja.frontend-url}")
    private String frontendUrl;

    public RegistroResposta registrar(Registro req) {
        String enderecoEmail = req.email().trim().toLowerCase();
        if (usuarios.existsByEmailIgnoreCase(enderecoEmail)) {
            throw new RegraNegocioException("Já existe uma conta com este e-mail.");
        }

        Usuario usuario = switch (req.perfil()) {
            case VIAJANTE -> new Viajante();
            case FORNECEDOR -> novoFornecedor(req);
            case ADMINISTRADOR -> throw new RegraNegocioException("Não é possível criar conta de administrador.");
        };
        usuario.setNome(req.nome().trim());
        usuario.setEmail(enderecoEmail);
        usuario.setDataNascimento(req.dataNascimento());
        // RN-01: só maiores de 18 anos criam conta.
        if (!usuario.maiorDeIdade(LocalDate.now())) {
            throw new RegraNegocioException("É preciso ter 18 anos ou mais para criar uma conta.");
        }
        usuario.setSenhaHash(passwordEncoder.encode(req.senha()));
        usuario.setEmailConfirmado(false);
        usuario.setTokenConfirmacao(UUID.randomUUID().toString());
        usuarios.save(usuario);

        String caminho = "/confirmar-email?token=" + usuario.getTokenConfirmacao();
        email.enviar(enderecoEmail, "Confirme seu e-mail",
                "Olá, " + usuario.getNome() + "! Confirme seu cadastro no ViaJá acessando: " + frontendUrl + caminho);

        String mensagem = req.perfil() == Perfil.FORNECEDOR
                ? "Cadastro criado. Confirme seu e-mail e aguarde a aprovação do administrador para publicar ofertas."
                : "Cadastro criado. Confirme seu e-mail para entrar.";
        // Sem SMTP configurado (modo demonstração) o link volta na resposta para a tela poder mostrá-lo.
        return new RegistroResposta(mensagem, email.envioRealConfigurado() ? null : caminho);
    }

    public String confirmarEmail(String token) {
        Usuario usuario = usuarios.findByTokenConfirmacao(token)
                .orElseThrow(() -> new RegraNegocioException("Link de confirmação inválido ou já utilizado."));
        usuario.setEmailConfirmado(true);
        usuario.setTokenConfirmacao(null);
        return "E-mail confirmado. Você já pode entrar.";
    }

    @Transactional(readOnly = true)
    public LoginResposta login(Login req) {
        Usuario usuario = usuarios.findByEmailIgnoreCase(req.email().trim())
                .filter(Usuario::isAtivo)
                .filter(u -> passwordEncoder.matches(req.senha(), u.getSenhaHash()))
                .orElseThrow(() -> new CredenciaisInvalidasException("E-mail ou senha incorretos."));
        if (!usuario.isEmailConfirmado()) {
            throw new CredenciaisInvalidasException("Confirme seu e-mail antes de entrar.");
        }
        return new LoginResposta(jwtService.gerar(usuario), UsuarioDTO.de(usuario));
    }

    private Fornecedor novoFornecedor(Registro req) {
        if (Texto.vazio(req.razaoSocial())) {
            throw new RegraNegocioException("Informe a razão social ou o nome do negócio.");
        }
        Fornecedor fornecedor = new Fornecedor();
        fornecedor.setRazaoSocial(req.razaoSocial().trim());
        fornecedor.setCnpj(Texto.vazio(req.cnpj()) ? null : req.cnpj().trim());
        // RN-06: nasce pendente; só publica depois que o administrador aprovar.
        fornecedor.setAprovado(false);
        return fornecedor;
    }
}
