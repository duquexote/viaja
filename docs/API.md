# API REST do ViaJá

Contrato entre o front-end (React) e o back-end (Spring Boot). Todas as rotas ficam sob `/api`, trocam JSON e, quando exigem login, recebem o cabeçalho `Authorization: Bearer <token>`.

## Convenções

- **Datas:** `AAAA-MM-DD`. **Data e hora:** `AAAA-MM-DDTHH:mm:ss` (horário local, sem fuso). **Horário:** `HH:mm`.
- **Dinheiro:** número decimal em Reais (RN-05), por exemplo `119.9`.
- **Erros:** qualquer resposta de erro tem o formato abaixo. `campos` só aparece em erro de validação.

```json
{ "erro": "Mensagem pronta para mostrar ao usuário", "campos": { "email": "E-mail inválido" } }
```

| Status | Significado |
|---|---|
| 400 | Dados inválidos (validação de campos) |
| 401 | Não autenticado, token expirado ou credenciais erradas |
| 403 | Perfil sem permissão para a rota |
| 404 | Recurso não encontrado |
| 422 | Regra de negócio violada (RN-01 a RN-10) |
| 429 | Limite diário do assistente de IA atingido (RN-09) |

## Objetos

### UsuarioDTO

```json
{
  "id": 1, "nome": "Ana Souza", "email": "ana@viaja.com", "dataNascimento": "1995-04-12",
  "perfil": "VIAJANTE",
  "interesses": ["Natureza", "Trilhas"],
  "razaoSocial": null, "cnpj": null, "aprovado": null, "bloqueado": null
}
```

`perfil` é `VIAJANTE`, `FORNECEDOR` ou `ADMINISTRADOR`. `interesses` só vale para viajante. `razaoSocial`, `cnpj`, `aprovado` e `bloqueado` só valem para fornecedor.

### OfertaDTO

Um único formato para os três tipos; os campos que não pertencem ao tipo vêm `null`.

```json
{
  "id": 10, "tipo": "PASSAGEM", "titulo": "Salvador → Lençóis (ônibus leito)",
  "descricao": "...", "cidade": "Lençóis", "preco": 119.9, "vagas": 40, "ativa": true,
  "fotoUrl": null, "fornecedorId": 4, "fornecedorNome": "Rápido Chapada Transportes",
  "notaMedia": 4.6, "totalAvaliacoes": 12,

  "origem": "Salvador", "destino": "Lençóis", "tipoTransporte": "RODOVIARIA",
  "partida": "2026-12-01T07:00:00", "chegada": "2026-12-01T13:30:00", "duracaoMinutos": 390,

  "tipoHospedagem": null, "comodidades": null, "capacidade": null,

  "categoria": null, "data": null, "horarioInicio": null, "duracaoHoras": null
}
```

| Campo | Tipo de oferta | Observação |
|---|---|---|
| `tipo` | todos | `PASSAGEM`, `HOSPEDAGEM` ou `PASSEIO` |
| `preco` | todos | Passagem e passeio: por pessoa. Hospedagem: diária por quarto |
| `vagas` | todos | Assentos, quartos ou lugares no passeio |
| `notaMedia`, `totalAvaliacoes` | todos | `totalAvaliacoes = 0` significa "ainda sem avaliações" |
| `origem`, `destino`, `tipoTransporte`, `partida`, `chegada`, `duracaoMinutos` | PASSAGEM | `tipoTransporte`: `AEREA` ou `RODOVIARIA`. `cidade` repete o destino |
| `tipoHospedagem`, `comodidades`, `capacidade` | HOSPEDAGEM | `tipoHospedagem`: `HOTEL`, `POUSADA`, `HOSTEL` ou `CASA`. `capacidade`: hóspedes por quarto |
| `categoria`, `data`, `horarioInicio`, `duracaoHoras` | PASSEIO | O passeio acontece em uma data fixa |

### ItinerarioDTO

```json
{
  "id": 3, "nome": "Chapada em 4 dias", "dataInicio": "2026-12-01", "dataFim": "2026-12-04",
  "totalDias": 4, "pessoas": 1, "custoTotal": 1079.7, "geradoPorIA": false,
  "itens": [
    { "id": 7, "dia": 1, "data": "2026-12-01", "horario": "07:00", "noites": null, "custo": 119.9,
      "oferta": { "...": "OfertaDTO" }, "reservaId": null, "reservaStatus": null }
  ],
  "conflitos": ["O check-in em Pousada Serra Viva (02/12) é 1 dia depois da chegada em Lençóis (01/12)."],
  "podeSolicitar": false
}
```

- `dia` começa em 1 (primeiro dia do itinerário); `data` é calculada a partir de `dataInicio`.
- `noites` só existe para hospedagem.
- `custo`: passagem e passeio = preço × pessoas; hospedagem = diária × noites × quartos necessários.
- `conflitos`: mensagens de conflito de datas ou de vagas (RF-08). Lista vazia = itinerário válido.
- `podeSolicitar`: `true` quando não há conflitos e existe item ainda sem reserva ativa (RN-08).
- `reservaStatus`: status da reserva criada a partir do item, quando houver.

### ReservaDTO

```json
{
  "id": 5, "status": "SOLICITADA",
  "dataSolicitacao": "2026-11-20T10:00:00", "dataResposta": null, "expiraEm": "2026-11-22T10:00:00",
  "pessoas": 2, "quantidade": 1, "noites": 3,
  "dataInicio": "2026-12-01T14:00:00", "dataFim": "2026-12-04T12:00:00",
  "valorTotal": 660.0, "motivo": null,
  "oferta": { "...": "OfertaDTO" },
  "viajanteId": 2, "viajanteNome": "Ana Souza",
  "podeCancelar": true, "podeAvaliar": false, "avaliada": false
}
```

- `status`: `SOLICITADA`, `CONFIRMADA`, `RECUSADA`, `EXPIRADA` ou `CANCELADA`.
- `quantidade`: vagas consumidas (assentos, quartos ou lugares). `noites` só para hospedagem.
- `expiraEm`: 48 h depois da solicitação (RN-07); só faz sentido enquanto `SOLICITADA`.
- `motivo`: motivo informado pelo fornecedor ao recusar.
- `podeCancelar`: status `SOLICITADA` ou `CONFIRMADA` e faltam mais de 48 h para o início (RN-03).
- `podeAvaliar`: reserva `CONFIRMADA`, já terminada e ainda não avaliada (RN-04).

### AvaliacaoDTO

```json
{ "id": 1, "nota": 5, "comentario": "Ótima pousada", "data": "2026-11-10",
  "viajanteNome": "Bruno Lima", "ofertaId": 30, "ofertaTitulo": "Pousada Serra Viva" }
```

### NotificacaoDTO

```json
{ "id": 9, "tipo": "RESERVA_CONFIRMADA", "mensagem": "Sua reserva em ... foi confirmada.",
  "lida": false, "criadaEm": "2026-11-20T10:05:00" }
```

`tipo`: `NOVA_SOLICITACAO`, `RESERVA_CONFIRMADA`, `RESERVA_RECUSADA`, `RESERVA_CANCELADA`, `RESERVA_EXPIRADA`, `LEMBRETE_VIAGEM`, `FORNECEDOR_APROVADO`, `FORNECEDOR_BLOQUEADO`.

### RoteiroDTO (sugestão do assistente de IA, ainda não salva)

```json
{
  "origem": "Salvador", "destino": "Lençóis", "dataInicio": "2026-12-01", "dataFim": "2026-12-04",
  "pessoas": 1, "orcamento": 1500, "custoTotal": 1079.7,
  "observacoes": "Roteiro focado em trilhas e cachoeiras.",
  "fonte": "IA", "aviso": null, "restantesHoje": 4,
  "dias": [
    { "dia": 1, "data": "2026-12-01",
      "itens": [ { "ofertaId": 10, "horario": "07:00", "noites": null, "motivo": "Ônibus mais barato do dia",
                   "custo": 119.9, "oferta": { "...": "OfertaDTO" } } ] }
  ]
}
```

- `fonte`: `IA` (modelo de linguagem) ou `PADRAO` (roteiro montado por regra quando a IA falha ou não está configurada, RNF-02).
- `aviso`: texto a mostrar em destaque quando `fonte = PADRAO`.
- `restantesHoje`: quantos roteiros o usuário ainda pode gerar hoje (limite de 5, RN-09).

## Rotas públicas

| Método e rota | Corpo ou parâmetros | Resposta |
|---|---|---|
| `GET /api/health` | | `{ "status": "ok" }` |
| `POST /api/auth/registrar` | `{ nome, email, senha, dataNascimento, perfil, razaoSocial?, cnpj? }` | 201 `{ mensagem, linkConfirmacaoDemo }` |
| `GET /api/auth/confirmar?token=` | | `{ mensagem }` |
| `POST /api/auth/login` | `{ email, senha }` | `{ token, usuario: UsuarioDTO }` |
| `GET /api/ofertas/opcoes` | | `{ cidades, origens, destinos, categorias, comodidades, tiposHospedagem, interesses }` (listas de texto) |
| `GET /api/ofertas/passagens` | `origem, destino, data, passageiros, precoMax, tipo, horario, ordenar` | `OfertaDTO[]` |
| `GET /api/ofertas/hospedagens` | `cidade, checkin, checkout, hospedes, precoMax, tipo, notaMin, comodidades, ordenar` | `OfertaDTO[]` |
| `GET /api/ofertas/passeios` | `cidade, data, dataFim, precoMax, categoria, ordenar` | `OfertaDTO[]` |
| `GET /api/ofertas/comparar?ids=1,2,3` | 2 a 4 ids do mesmo tipo (RN-10) | `OfertaDTO[]` |
| `GET /api/ofertas/{id}` | | `OfertaDTO` |
| `GET /api/ofertas/{id}/avaliacoes` | | `AvaliacaoDTO[]` |

Regras das rotas públicas:

- **Cadastro:** `perfil` aceita `VIAJANTE` ou `FORNECEDOR`; `senha` com no mínimo 6 caracteres; idade mínima de 18 anos (RN-01); `razaoSocial` obrigatória para fornecedor. O login só funciona depois da confirmação de e-mail. `linkConfirmacaoDemo` traz o caminho `/confirmar-email?token=...` quando o envio real de e-mail não está configurado (modo demonstração); o front-end mostra esse link na tela.
- **Buscas:** todos os parâmetros são opcionais. Só retornam ofertas ativas, com vagas suficientes, de fornecedor aprovado e com data futura.
  - Passagens: `tipo` = `AEREA` ou `RODOVIARIA`; `horario` = `MANHA` (05h–12h), `TARDE` (12h–18h) ou `NOITE` (18h–05h); `ordenar` = `preco` (padrão) ou `duracao`.
  - Hospedagens: `comodidades` é lista separada por vírgula (a oferta precisa ter todas); `notaMin` de 0 a 5; `ordenar` = `preco` (padrão) ou `nota`. `hospedes` filtra pela capacidade total disponível.
  - Passeios: `data` sozinho busca um dia; `data` + `dataFim` busca um período; `ordenar` = `preco` (padrão), `nota` ou `data`.

## Conta do usuário (qualquer perfil logado)

| Método e rota | Corpo | Resposta |
|---|---|---|
| `GET /api/usuarios/eu` | | `UsuarioDTO` |
| `PUT /api/usuarios/eu` | `{ nome, dataNascimento, interesses?, razaoSocial?, cnpj?, senhaAtual?, novaSenha? }` | `UsuarioDTO` |
| `DELETE /api/usuarios/eu` | | 204. Remove os dados pessoais e encerra a conta (LGPD, RNF-04) |
| `GET /api/notificacoes` | | `NotificacaoDTO[]` (mais recentes primeiro) |
| `GET /api/notificacoes/nao-lidas` | | `{ total }` |
| `POST /api/notificacoes/{id}/lida` | | 204 |
| `POST /api/notificacoes/lidas` | | 204 (marca todas como lidas) |

## Viajante

| Método e rota | Corpo | Resposta |
|---|---|---|
| `GET /api/itinerarios` | | `ItinerarioDTO[]` |
| `POST /api/itinerarios` | `{ nome, dataInicio, dataFim, pessoas, geradoPorIA?, itens?: [{ ofertaId, dia?, horario?, noites? }] }` | 201 `ItinerarioDTO` |
| `GET /api/itinerarios/{id}` | | `ItinerarioDTO` |
| `PUT /api/itinerarios/{id}` | `{ nome, dataInicio, dataFim, pessoas }` | `ItinerarioDTO` |
| `DELETE /api/itinerarios/{id}` | | 204 |
| `POST /api/itinerarios/{id}/itens` | `{ ofertaId, dia?, horario?, noites? }` | `ItinerarioDTO` |
| `PUT /api/itinerarios/{id}/itens/{itemId}` | `{ dia, horario?, noites? }` | `ItinerarioDTO` |
| `DELETE /api/itinerarios/{id}/itens/{itemId}` | | `ItinerarioDTO` |
| `POST /api/itinerarios/{id}/solicitar` | | `ItinerarioDTO` (cria reserva para cada item sem reserva ativa; 422 se houver conflito, RN-08) |
| `GET /api/reservas` | | `ReservaDTO[]` |
| `POST /api/reservas` | `{ ofertaId, pessoas, dataInicio?, noites? }` | 201 `ReservaDTO` |
| `POST /api/reservas/{id}/cancelar` | | `ReservaDTO` (422 se faltarem menos de 48 h, RN-03) |
| `POST /api/reservas/{id}/avaliacao` | `{ nota, comentario }` | 201 `AvaliacaoDTO` (RN-04) |
| `GET /api/assistente/uso` | | `{ usados, limite, restantes }` |
| `POST /api/assistente/roteiro` | `{ origem, destino, dataIda, dataVolta, pessoas, orcamento, interesses }` | `RoteiroDTO` (429 ao passar do limite diário) |

Detalhes:

- **Adicionar item sem `dia`:** passagem e passeio entram no dia da própria data (422 se a data estiver fora do período do itinerário); hospedagem entra no dia da chegada à cidade (ou no dia 1) e ocupa as noites até a saída. Informar `dia` manualmente é permitido e pode gerar conflito, que aparece em `conflitos`.
- **Reserva avulsa de hospedagem:** `dataInicio` (data do check-in) e `noites` são obrigatórios. Para passagem e passeio as datas vêm da própria oferta.
- **Assistente:** `interesses` aceita até 3 itens. O roteiro devolvido não é salvo; para salvar, o front-end envia `POST /api/itinerarios` com `geradoPorIA: true` e os itens que o viajante manteve.

## Fornecedor

| Método e rota | Corpo | Resposta |
|---|---|---|
| `GET /api/fornecedor/ofertas` | | `OfertaDTO[]` (inclui inativas) |
| `POST /api/fornecedor/ofertas` | `OfertaRequest` | 201 `OfertaDTO` (403 se o fornecedor não estiver aprovado, RN-06) |
| `PUT /api/fornecedor/ofertas/{id}` | `OfertaRequest` | `OfertaDTO` |
| `PATCH /api/fornecedor/ofertas/{id}/ativa` | `{ ativa }` | `OfertaDTO` |
| `GET /api/fornecedor/reservas` | parâmetro opcional `status` | `ReservaDTO[]` |
| `POST /api/fornecedor/reservas/{id}/aceitar` | | `ReservaDTO` (desconta as vagas, RN-02) |
| `POST /api/fornecedor/reservas/{id}/recusar` | `{ motivo? }` | `ReservaDTO` |

`OfertaRequest` usa os mesmos nomes de campo do `OfertaDTO`:

```json
{
  "tipo": "HOSPEDAGEM", "titulo": "...", "descricao": "...", "cidade": "Lençóis",
  "preco": 220, "vagas": 6, "fotoUrl": null,
  "origem": null, "destino": null, "tipoTransporte": null, "partida": null, "chegada": null,
  "tipoHospedagem": "POUSADA", "comodidades": ["Wi-Fi", "Café da manhã"], "capacidade": 2,
  "categoria": null, "data": null, "horarioInicio": null, "duracaoHoras": null
}
```

Campos obrigatórios por tipo: PASSAGEM exige `origem`, `destino`, `tipoTransporte`, `partida` e `chegada` (a `cidade` é preenchida com o destino); HOSPEDAGEM exige `cidade`, `tipoHospedagem` e `capacidade`; PASSEIO exige `cidade`, `categoria`, `data`, `horarioInicio` e `duracaoHoras`. O `tipo` não muda na edição.

## Administrador

| Método e rota | Resposta |
|---|---|
| `GET /api/admin/indicadores` | `{ totalUsuarios, totalViajantes, totalFornecedores, fornecedoresPendentes, ofertasAtivas, totalItinerarios, totalReservas, reservasPorStatus, totalAvaliacoes }` |
| `GET /api/admin/fornecedores` | `UsuarioDTO[]` |
| `POST /api/admin/fornecedores/{id}/aprovar` | `UsuarioDTO` |
| `POST /api/admin/fornecedores/{id}/bloquear` | `UsuarioDTO` |
| `GET /api/admin/avaliacoes` | `AvaliacaoDTO[]` |
| `DELETE /api/admin/avaliacoes/{id}` | 204 |

`reservasPorStatus` é um objeto como `{ "SOLICITADA": 2, "CONFIRMADA": 5, "RECUSADA": 0, "EXPIRADA": 0, "CANCELADA": 1 }`.
