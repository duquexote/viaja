# ViaJá

Plataforma web que reúne, em um só lugar, a busca de passagens, hospedagens e passeios, a montagem de itinerários com validação de datas, um assistente de roteiro com IA e a solicitação de reserva sem pagamento. MVP acadêmico da disciplina **Tópicos Avançados em Programação** (UCSAL, Engenharia de Software), com foco em destinos da Bahia.

| Camada | Tecnologia |
|---|---|
| Back-end | Java 17, Spring Boot 3.5 (Web, Security, Data JPA, Validation), JWT |
| Front-end | React 19, Vite 8, Tailwind CSS 4, React Router 7 |
| Banco de dados | H2 em memória, embutido na API (sem instalação nem configuração) |
| Serviço de IA | API Gemini, do Google, chamada só pelo back-end |

## Entregáveis

| Item do roteiro | Onde está |
|---|---|
| 11. Repositório versionado | Este repositório |
| 12. Modelo C4 (Contexto, Contêineres, Componentes e Código) | [`docs/c4`](docs/c4/README.md), com a versão para Overleaf em [`docs/c4/modelo-c4.tex`](docs/c4/modelo-c4.tex) |
| 13. Telas do front-end | [`docs/telas`](docs/telas/README.md), 31 capturas da aplicação rodando |
| 14. Código do back-end | [`backend`](backend) |
| 15. Vídeo explicativo | Individual, gravado por cada integrante |

Documentação de apoio: [contrato da API REST](docs/API.md) e [guia do front-end](frontend/README.md).

## Como rodar

Pré-requisitos: **JDK 17 ou superior** e **Node.js 20 ou superior**. Não é preciso instalar Maven nem banco de dados.

**1. Back-end** (porta 8080)

```bash
cd backend
./mvnw spring-boot:run
```

No Windows (cmd ou PowerShell), use `.\mvnw.cmd spring-boot:run`. Sem configuração nenhuma, a API sobe com um banco H2 em memória e cria a base de demonstração.

**2. Front-end** (porta 5173), em outro terminal

```bash
cd frontend
npm install
npm run dev
```

Abra <http://localhost:5173>.

### Contas de demonstração

Todas usam a mesma senha, definida em `SEED_SENHA` (o valor padrão está em [`backend/.env.example`](backend/.env.example)). Na tela de login, em modo de desenvolvimento, há botões que preenchem os dados.

| E-mail | Perfil | Para demonstrar |
|---|---|---|
| `ana@viaja.com` | Viajante | Itinerário pronto de 4 dias em Lençóis e uma viagem passada para avaliar |
| `pousada@viaja.com` | Fornecedor (pousada) | Ofertas de hospedagem e uma solicitação aguardando resposta |
| `onibus@viaja.com` | Fornecedor (ônibus) | Passagens rodoviárias e uma solicitação aguardando resposta |
| `guia@viaja.com` | Fornecedor (guia) | Passeios na Chapada e uma solicitação aguardando resposta |
| `novo@viaja.com` | Fornecedor pendente | Cadastro aguardando aprovação do administrador |
| `admin@viaja.com` | Administrador | Indicadores, aprovação de fornecedores e moderação |

A base tem 6 cidades (Salvador, Lençóis, Porto Seguro, Ilhéus, Itacaré e Praia do Forte), 15 hospedagens com avaliações e passagens e passeios para os próximos 21 dias.

### Banco de dados

O banco é o **H2 em memória**, que roda dentro da própria API. Os dados existem enquanto a API está no ar: ao reiniciar, o que foi cadastrado some e a base de demonstração é recriada, com as datas das ofertas contadas a partir do dia do início. Isso deixa a demonstração sempre no mesmo ponto de partida e dispensa instalar banco.

## Assistente de roteiro com IA

O viajante informa origem, destino, datas, número de pessoas, orçamento e até 3 interesses. O back-end busca as ofertas ativas, envia o pedido e a lista ao modelo de linguagem, valida a resposta (ids existentes, datas compatíveis, custo dentro do orçamento) e devolve o roteiro para o viajante ajustar e salvar.

O modelo de linguagem é o **Gemini**, do Google. Para ligar a IA, crie uma chave em <https://aistudio.google.com/apikey>, copie `backend/.env.example` para `backend/.env` e preencha:

```properties
GEMINI_API_KEY=sua-chave
```

O arquivo `.env` está no `.gitignore` e nunca deve ser enviado ao repositório. A API tenta os modelos da lista `IA_MODELOS` em ordem: se o primeiro estiver sobrecarregado ou lento, passa para o seguinte, sempre dentro do limite total de 15 segundos.

Sem a chave, ou se nenhum modelo responder a tempo, o assistente devolve um **roteiro padrão** montado por regra (transporte mais barato, hospedagem mais bem avaliada que cabe no orçamento e passeios pelos interesses) e avisa na tela. Cada usuário pode gerar até 5 roteiros por dia. Nenhum dado pessoal do viajante é enviado ao modelo.

## Testes

```bash
cd backend
./mvnw test
```

São 16 testes: o fluxo completo do BPMN (buscar, solicitar, aceitar, descontar vagas e notificar), o controle de acesso por perfil, as regras RN-01 e RN-10, o assistente com e sem IA (incluindo o descarte de oferta inventada pelo modelo), o cliente do Gemini contra um servidor falso e seis casos de conflito de datas do itinerário. Os testes não usam a internet nem a chave real.

No front-end, `npm run lint` e `npm run build` verificam o código.

## Requisitos atendidos

| Requisito | Onde está no código |
|---|---|
| RF-01 Cadastro e login com confirmação de e-mail | `AuthService`, `JwtService` |
| RF-02 Edição de perfil e exclusão da conta | `UsuarioService` |
| RF-03 Cadastro, edição e desativação de ofertas | `OfertaService`, `FornecedorController` |
| RF-04 a RF-06 Buscas de passagens, hospedagens e passeios | `OfertaService`, `OfertaController` |
| RF-07 Comparação de até 4 ofertas | `OfertaService.comparar` |
| RF-08 Itinerário por dia com alerta de conflito e custo total | `ItinerarioService`, `ValidadorItinerario` |
| RF-09 Assistente de roteiro com IA | `AssistenteIAService`, `GeminiClienteLLM` |
| RF-10 a RF-12 Solicitar, responder e cancelar reservas | `ReservaService`, classe `Reserva` |
| RF-13 Avaliação de itens usufruídos | `AvaliacaoService` |
| RF-14 Notificações no sistema e por e-mail | `NotificacaoService`, `EmailService` |
| RF-15 Painel administrativo | `AdminService`, `AdminController` |

As dez regras de negócio (RN-01 a RN-10) estão marcadas em comentários nos pontos do código que as aplicam.

## Limites deste MVP

- **Sem pagamento**, de propósito: a reserva é solicitada na plataforma e o pagamento é combinado direto com o fornecedor.
- **Banco em memória:** reiniciar a API apaga o que foi cadastrado e recria a base de demonstração.
- **E-mail:** sem um servidor SMTP configurado no `.env`, os e-mails são apenas registrados no log da API, e o link de confirmação de cadastro aparece na própria tela.
- **Fotos:** a oferta guarda o endereço de uma imagem; não há envio de arquivo.
- **Vagas de hospedagem:** são um contador de quartos, sem calendário de disponibilidade por data.
- **Recuperação de senha** não foi implementada.

## Estrutura do repositório

```
backend/    API REST em Java com Spring Boot
  src/main/java/br/ucsal/viaja/
    config/       segurança e base de demonstração
    domain/       entidades e regras do modelo
    dto/          objetos trocados com o front-end
    repository/   acesso ao banco (Spring Data JPA)
    security/     JWT
    service/      regras de negócio (ia/ tem o assistente)
    web/          controllers REST
frontend/   aplicação React
docs/
  API.md      contrato da API
  c4/         modelo C4 (Markdown, LaTeX e diagramas)
  telas/      capturas de tela
```

## Equipe

| Papel | Integrante |
|---|---|
| ScrumMaster | Lucca |
| Product Owner | Guilherme |
| Dev Front-end | William |
| Dev Back-end | João Pedro |
| QA e Documentação | Abraão |

Professor: Elton Figueiredo da Silva.
