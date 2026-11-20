# ViaJá · Front-end

Interface web do ViaJá, feita em React + Vite + Tailwind CSS. Consome a API REST do back-end Spring Boot descrita em [`docs/API.md`](../docs/API.md).

## Como rodar

Pré-requisitos: Node.js 20 ou superior e o back-end no ar em `http://localhost:8080`.

```bash
npm install
npm run dev
```

O site abre em `http://localhost:5173`. Em desenvolvimento, as chamadas a `/api` são repassadas pelo Vite para o back-end (proxy), então não é preciso configurar CORS.

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento com recarga automática |
| `npm run build` | Gera a versão de produção em `dist/` |
| `npm run preview` | Serve a pasta `dist/` para conferência |
| `npm run lint` | Verifica o código com ESLint |

### Variáveis de ambiente (opcionais)

| Variável | Padrão | Uso |
|---|---|---|
| `VITE_API_URL` | `/api` | Endereço da API em produção, por exemplo `https://api.exemplo.com/api` |
| `VIAJA_BACKEND_URL` | `http://localhost:8080` | Destino do proxy do Vite em desenvolvimento |

Na tela de login, em modo de desenvolvimento, aparece um bloco "Contas de demonstração" que preenche o e-mail e a senha das contas criadas pela base de demonstração do back-end. Esse bloco não entra na versão de produção.

## Organização

```
src/
  api/          cliente HTTP (fetch + token JWT) e uma função por rota da API
  components/   peças reutilizadas: cabeçalho, cartão de oferta, modais, campos, alertas
  contexts/     sessão do usuário, notificações, seleção para comparar e avisos
  lib/          formatação (moeda, datas), regras de exibição das ofertas e hooks de dados
  pages/        uma tela por rota
  index.css     identidade visual (cores, fontes, botões e campos)
```

## Telas e rotas

| Rota | Tela | Acesso | Requisitos |
|---|---|---|---|
| `/` | Início com busca rápida | Público | RF-04, RF-05, RF-06 |
| `/entrar`, `/cadastro`, `/confirmar-email` | Login, cadastro e confirmação de e-mail | Público | RF-01 |
| `/passagens`, `/hospedagens`, `/passeios` | Buscas com filtros e ordenação | Público | RF-04, RF-05, RF-06 |
| `/comparar` | Comparação lado a lado de até 4 ofertas | Público | RF-07 |
| `/ofertas/:id` | Detalhes, avaliações e pedido de reserva | Público (reservar exige viajante) | RF-10 |
| `/itinerarios`, `/itinerarios/:id` | Itinerário por dia, conflitos e custo total | Viajante | RF-08, RF-10 |
| `/assistente` | Assistente de roteiro com IA | Viajante | RF-09 |
| `/reservas` | Acompanhar, cancelar e avaliar | Viajante | RF-12, RF-13 |
| `/notificacoes` | Notificações do sistema | Logado | RF-14 |
| `/perfil` | Editar dados, trocar senha, excluir conta | Logado | RF-02 |
| `/fornecedor` | Ofertas e solicitações de reserva | Fornecedor | RF-03, RF-11 |
| `/admin` | Indicadores, fornecedores e avaliações | Administrador | RF-15 |

## Acessibilidade e responsividade

- Layout de 320 px a 1920 px, sem rolagem horizontal (a tabela de comparação rola dentro do próprio quadro).
- Todo campo tem rótulo, o foco do teclado é sempre visível e há um atalho "Pular para o conteúdo".
- Erros e estados de carregamento são anunciados para leitores de tela (`role="alert"`, `role="status"`).
- As janelas modais usam o elemento `<dialog>`: prendem o foco, fecham com Esc e devolvem o foco ao botão de origem.
- As fontes são empacotadas com o projeto (`@fontsource`), sem depender de serviços externos.
