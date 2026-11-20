import { useCallback, useEffect, useState } from 'react'
import { ofertas } from '../api/index.js'

/**
 * Busca dados da API e expõe os três estados que toda tela precisa: carregando, erro e dados.
 * `recarregar` refaz a busca; `definir` troca os dados localmente (ex.: resposta de uma alteração).
 */
export function useDados(buscar, dependencias = [], habilitado = true) {
  const [estado, setEstado] = useState({ dados: null, carregando: habilitado, erro: null })
  const [versao, setVersao] = useState(0)

  useEffect(() => {
    if (!habilitado) return undefined
    let ativo = true
    setEstado((atual) => ({ ...atual, carregando: true, erro: null }))
    buscar()
      .then((dados) => {
        if (ativo) setEstado({ dados, carregando: false, erro: null })
      })
      .catch((erro) => {
        if (ativo) setEstado({ dados: null, carregando: false, erro: erro?.message || 'Não foi possível carregar.' })
      })
    return () => {
      ativo = false
    }
    // `buscar` é recriada a cada render; quem decide quando refazer a busca são as dependências.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencias, versao, habilitado])

  const recarregar = useCallback(() => setVersao((v) => v + 1), [])
  const definir = useCallback((novo) => {
    setEstado((atual) => ({
      dados: typeof novo === 'function' ? novo(atual.dados) : novo,
      carregando: false,
      erro: null,
    }))
  }, [])

  return { ...estado, recarregar, definir }
}

export function useTitulo(titulo) {
  useEffect(() => {
    document.title = titulo ? `${titulo} · ViaJá` : 'ViaJá · Passagens, hospedagens e roteiros pela Bahia'
  }, [titulo])
}

const OPCOES_VAZIAS = {
  cidades: [],
  origens: [],
  destinos: [],
  categorias: [],
  comodidades: [],
  tiposHospedagem: [],
  interesses: [],
}

let opcoesEmCache = null

/** Listas de apoio dos formulários (cidades, categorias, comodidades...). Uma só chamada por visita. */
export function useOpcoes() {
  const [opcoes, setOpcoes] = useState(OPCOES_VAZIAS)

  useEffect(() => {
    let ativo = true
    opcoesEmCache ??= ofertas.opcoes().catch((erro) => {
      opcoesEmCache = null
      throw erro
    })
    opcoesEmCache
      .then((dados) => {
        if (ativo) setOpcoes({ ...OPCOES_VAZIAS, ...dados })
      })
      .catch(() => {
        // Sem as listas, os formulários continuam utilizáveis (campos de texto livres e selects vazios).
      })
    return () => {
      ativo = false
    }
  }, [])

  return opcoes
}

/** Garante que o valor atual apareça no select mesmo antes de as opções chegarem. */
export function comValorAtual(lista, valor) {
  return valor && !lista.includes(valor) ? [valor, ...lista] : lista
}
