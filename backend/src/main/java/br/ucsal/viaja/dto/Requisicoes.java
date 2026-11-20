package br.ucsal.viaja.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

import br.ucsal.viaja.domain.Perfil;
import br.ucsal.viaja.domain.TipoHospedagem;
import br.ucsal.viaja.domain.TipoOferta;
import br.ucsal.viaja.domain.TipoTransporte;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Size;

/** Corpos de requisição e respostas simples da API, agrupados por área. Ver docs/API.md. */
public final class Requisicoes {

    private Requisicoes() {
    }

    // ---------- Autenticação e conta ----------

    public record Registro(
            @NotBlank(message = "Informe o nome.") @Size(max = 120, message = "Nome muito longo.") String nome,
            @NotBlank(message = "Informe o e-mail.") @Email(message = "E-mail inválido.") String email,
            @NotBlank(message = "Informe a senha.")
            @Size(min = 6, max = 72, message = "A senha deve ter de 6 a 72 caracteres.") String senha,
            @NotNull(message = "Informe a data de nascimento.")
            @Past(message = "Data de nascimento inválida.") LocalDate dataNascimento,
            @NotNull(message = "Escolha o perfil.") Perfil perfil,
            String razaoSocial,
            String cnpj) {
    }

    public record RegistroResposta(String mensagem, String linkConfirmacaoDemo) {
    }

    public record Mensagem(String mensagem) {
    }

    public record Login(
            @NotBlank(message = "Informe o e-mail.") String email,
            @NotBlank(message = "Informe a senha.") String senha) {
    }

    public record LoginResposta(String token, UsuarioDTO usuario) {
    }

    public record PerfilUsuario(
            @NotBlank(message = "Informe o nome.") @Size(max = 120, message = "Nome muito longo.") String nome,
            @NotNull(message = "Informe a data de nascimento.")
            @Past(message = "Data de nascimento inválida.") LocalDate dataNascimento,
            List<String> interesses,
            String razaoSocial,
            String cnpj,
            String senhaAtual,
            String novaSenha) {
    }

    // ---------- Ofertas ----------

    public record OfertaForm(
            @NotNull(message = "Escolha o tipo da oferta.") TipoOferta tipo,
            @NotBlank(message = "Informe o título.") @Size(max = 160, message = "Título muito longo.") String titulo,
            @Size(max = 2000, message = "Descrição muito longa.") String descricao,
            String cidade,
            @NotNull(message = "Informe o preço.")
            @DecimalMin(value = "0.01", message = "O preço deve ser maior que zero.") BigDecimal preco,
            @NotNull(message = "Informe as vagas.") @Min(value = 0, message = "Vagas não pode ser negativo.") Integer vagas,
            @Size(max = 500, message = "Endereço da foto muito longo.") String fotoUrl,
            String origem,
            String destino,
            TipoTransporte tipoTransporte,
            LocalDateTime partida,
            LocalDateTime chegada,
            TipoHospedagem tipoHospedagem,
            List<String> comodidades,
            Integer capacidade,
            String categoria,
            LocalDate data,
            LocalTime horarioInicio,
            Integer duracaoHoras) {
    }

    public record Ativacao(@NotNull(message = "Informe se a oferta fica ativa.") Boolean ativa) {
    }

    public record Opcoes(
            List<String> cidades,
            List<String> origens,
            List<String> destinos,
            List<String> categorias,
            List<String> comodidades,
            List<String> tiposHospedagem,
            List<String> interesses) {
    }

    // ---------- Itinerários ----------

    public record ItinerarioForm(
            @NotBlank(message = "Dê um nome ao itinerário.") @Size(max = 120, message = "Nome muito longo.") String nome,
            @NotNull(message = "Informe a data de início.") LocalDate dataInicio,
            @NotNull(message = "Informe a data de fim.") LocalDate dataFim,
            @Min(value = 1, message = "Informe pelo menos 1 pessoa.")
            @Max(value = 20, message = "Máximo de 20 pessoas por itinerário.") Integer pessoas,
            Boolean geradoPorIA,
            @Valid List<ItemForm> itens) {
    }

    public record ItemForm(
            Long ofertaId,
            Integer dia,
            LocalTime horario,
            @Min(value = 1, message = "Informe pelo menos 1 noite.") Integer noites) {
    }

    // ---------- Reservas e avaliações ----------

    public record ReservaForm(
            @NotNull(message = "Informe a oferta.") Long ofertaId,
            @NotNull(message = "Informe o número de pessoas.")
            @Min(value = 1, message = "Informe pelo menos 1 pessoa.")
            @Max(value = 20, message = "Máximo de 20 pessoas por reserva.") Integer pessoas,
            LocalDate dataInicio,
            @Min(value = 1, message = "Informe pelo menos 1 noite.") Integer noites) {
    }

    public record Recusa(@Size(max = 500, message = "Motivo muito longo.") String motivo) {
    }

    public record AvaliacaoForm(
            @NotNull(message = "Dê uma nota de 1 a 5.")
            @Min(value = 1, message = "A nota mínima é 1.")
            @Max(value = 5, message = "A nota máxima é 5.") Integer nota,
            @Size(max = 1000, message = "Comentário muito longo.") String comentario) {
    }

    // ---------- Assistente de IA ----------

    public record PedidoRoteiro(
            String origem,
            @NotBlank(message = "Informe o destino.") String destino,
            @NotNull(message = "Informe a data de ida.") LocalDate dataIda,
            @NotNull(message = "Informe a data de volta.") LocalDate dataVolta,
            @NotNull(message = "Informe o número de pessoas.")
            @Min(value = 1, message = "Informe pelo menos 1 pessoa.")
            @Max(value = 20, message = "Máximo de 20 pessoas.") Integer pessoas,
            @NotNull(message = "Informe o orçamento.")
            @DecimalMin(value = "1", message = "O orçamento deve ser maior que zero.") BigDecimal orcamento,
            @Size(max = 3, message = "Escolha até 3 interesses.") List<String> interesses) {
    }

    public record UsoAssistente(long usados, int limite, long restantes) {
    }

    // ---------- Notificações e administração ----------

    public record Total(long total) {
    }

    public record Indicadores(
            long totalUsuarios,
            long totalViajantes,
            long totalFornecedores,
            long fornecedoresPendentes,
            long ofertasAtivas,
            long totalItinerarios,
            long totalReservas,
            Map<String, Long> reservasPorStatus,
            long totalAvaliacoes) {
    }
}
