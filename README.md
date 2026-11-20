# ViaJá

Plataforma web que reúne, em um só lugar, a busca de passagens, hospedagens e passeios, a montagem de itinerários com validação de datas, um assistente de roteiro com IA e a solicitação de reserva sem pagamento. MVP acadêmico da disciplina **Tópicos Avançados em Programação** (UCSAL, Engenharia de Software), com foco em destinos da Bahia.

| Camada | Tecnologia |
|---|---|
| Back-end | Java 17, Spring Boot 3.5 (Web, Security, Data JPA, Validation), JWT |
| Front-end | React 19, Vite 8, Tailwind CSS 4, React Router 7 |
| Banco de dados | PostgreSQL no Supabase (ou H2 em memória, sem configuração, para desenvolver) |
| Serviço de IA | API Claude, da Anthropic, chamada só pelo back-end |

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

A base tem 6 cidades (Salvador, Lençóis, Porto Seguro, Ilhéus, Itacaré e Praia do Forte), 15 hospedagens com avaliações e passagens e passeios para os próximos 21 dias. A cada início a API completa as datas que faltam, então sempre há ofertas futuras.

## Usando o Supabase como banco

1. Crie um projeto em <https://supabase.com> e guarde a senha do banco.
2. No painel, abra **Connect** e copie os dados do **Session pooler** (porta 5432).
3. Copie `backend/.env.example` para `backend/.env` e preencha:

   ```properties
   DB_URL=jdbc:postgresql://aws-0-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require
   DB_USER=postgres.SEU_PROJECT_REF
   DB_PASSWORD=SUA_SENHA_DO_BANCO
   JWT_SECRET=um-texto-aleatorio-com-32-caracteres-ou-mais
   ```

   O Supabase mostra o endereço como `postgresql://usuario:senha@host:5432/postgres`. No `DB_URL` entra só `jdbc:postgresql://host:5432/postgres?sslmode=require`; usuário e senha vão nas outras duas linhas.
4. Suba o back-end normalmente. No primeiro início ele cria as tabelas e a base de demonstração.

As tabelas ficam no esquema `viaja`, e não no `public`. O Supabase expõe o esquema `public` pela Data API dele; manter os dados em outro esquema garante que o único caminho até eles é a API Java, com as regras de negócio e o controle de acesso. O arquivo `.env` está no `.gitignore` e nunca deve ser enviado ao repositório.

## Assistente de roteiro com IA

O viajante informa origem, destino, datas, número de pessoas, orçamento e até 3 interesses. O back-end busca as ofertas ativas, envia o pedido e a lista ao modelo de linguagem, valida a resposta (ids existentes, datas compatíveis, custo dentro do orçamento) e devolve o roteiro para o viajante ajustar e salvar.

Para ligar a IA, coloque no `backend/.env`:

```properties
ANTHROPIC_API_KEY=sua-chave
```

Sem a chave, ou se o modelo demorar mais de 15 segundos, o assistente devolve um **roteiro padrão** montado por regra (transporte mais barato, hospedagem mais bem avaliada que cabe no orçamento e passeios pelos interesses) e avisa na tela. Cada usuário pode gerar até 5 roteiros por dia. Nenhum dado pessoal do viajante é enviado ao modelo.

## Testes

```bash
cd backend
./mvnw test
```

São 11 testes: o fluxo completo do BPMN (buscar, solicitar, aceitar, descontar vagas e notificar), o controle de acesso por perfil, as regras RN-01 e RN-10, o assistente sem IA e seis casos de conflito de datas do itinerário.

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
| RF-09 Assistente de roteiro com IA | `AssistenteIAService`, `ClaudeClienteLLM` |
| RF-10 a RF-12 Solicitar, responder e cancelar reservas | `ReservaService`, classe `Reserva` |
| RF-13 Avaliação de itens usufruídos | `AvaliacaoService` |
| RF-14 Notificações no sistema e por e-mail | `NotificacaoService`, `EmailService` |
| RF-15 Painel administrativo | `AdminService`, `AdminController` |

As dez regras de negócio (RN-01 a RN-10) estão marcadas em comentários nos pontos do código que as aplicam.

## Limites deste MVP

- **Sem pagamento**, de propósito: a reserva é solicitada na plataforma e o pagamento é combinado direto com o fornecedor.
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
