// Cliente HTTP do ViaJá: fala com a API REST descrita em docs/API.md.

const BASE = import.meta.env.VITE_API_URL ?? '/api'
const CHAVE_SESSAO = 'viaja.sessao'

/** Erro de API já com a mensagem pronta para mostrar ao usuário. */
export class ApiErro extends Error {
  constructor(mensagem, status, campos) {
    super(mensagem)
    this.name = 'ApiErro'
    this.status = status
    this.campos = campos ?? null
  }
}

export function lerSessao() {
  try {
    const bruto = localStorage.getItem(CHAVE_SESSAO)
    const sessao = bruto ? JSON.parse(bruto) : null
    return sessao?.token && sessao?.usuario ? sessao : null
  } catch {
    return null
  }
}

export function gravarSessao(sessao) {
  try {
    if (sessao) localStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao))
    else localStorage.removeItem(CHAVE_SESSAO)
  } catch {
    // Sem acesso ao armazenamento (modo privado restrito): a sessão vale só em memória.
  }
}

let aoExpirar = null

/** Registra o que fazer quando o servidor recusa o token salvo (sessão expirada). */
export function definirAoExpirar(funcao) {
  aoExpirar = funcao
}

const MENSAGENS_PADRAO = {
  400: 'Confira os dados informados e tente de novo.',
  401: 'Sua sessão expirou. Entre novamente.',
  403: 'Você não tem permissão para fazer isso.',
  404: 'Não encontramos o que você procurava.',
  422: 'Não foi possível concluir a operação.',
  429: 'Você atingiu o limite de uso por hoje.',
}

function montarUrl(caminho, params) {
  const consulta = new URLSearchParams()
  for (const [chave, valor] of Object.entries(params ?? {})) {
    if (valor !== undefined && valor !== null && valor !== '') consulta.set(chave, valor)
  }
  const texto = consulta.toString()
  return BASE + caminho + (texto ? `?${texto}` : '')
}

export async function api(caminho, { metodo = 'GET', corpo, params } = {}) {
  const sessao = lerSessao()
  const headers = { Accept: 'application/json' }
  if (corpo !== undefined) headers['Content-Type'] = 'application/json'
  if (sessao?.token) headers.Authorization = `Bearer ${sessao.token}`

  let resposta
  try {
    resposta = await fetch(montarUrl(caminho, params), {
      method: metodo,
      headers,
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    })
  } catch {
    throw new ApiErro('Não foi possível falar com o servidor. Verifique a conexão e tente de novo.', 0)
  }

  let dados = null
  if (resposta.status !== 204) {
    const texto = await resposta.text()
    if (texto) {
      try {
        dados = JSON.parse(texto)
      } catch {
        dados = null
      }
    }
  }

  if (!resposta.ok) {
    if (resposta.status === 401 && sessao?.token) {
      gravarSessao(null)
      aoExpirar?.()
    }
    const mensagem =
      dados?.erro ?? MENSAGENS_PADRAO[resposta.status] ?? 'O servidor não respondeu como esperado. Tente de novo em instantes.'
    throw new ApiErro(mensagem, resposta.status, dados?.campos)
  }

  return dados
}
