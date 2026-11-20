import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAvisos } from './AvisosContext.jsx'

const CompararContext = createContext(null)

const CHAVE = 'viaja.comparar'
export const LIMITE_COMPARACAO = 4

function lerInicial() {
  try {
    const lista = JSON.parse(sessionStorage.getItem(CHAVE) ?? '[]')
    return Array.isArray(lista) ? lista.slice(0, LIMITE_COMPARACAO) : []
  } catch {
    return []
  }
}

/** Seleção de ofertas para comparar: até 4, todas do mesmo tipo (RN-10). */
export function CompararProvider({ children }) {
  const [itens, setItens] = useState(lerInicial)
  const { avisar } = useAvisos()

  useEffect(() => {
    try {
      sessionStorage.setItem(CHAVE, JSON.stringify(itens))
    } catch {
      // Sem sessionStorage a seleção vale só enquanto a página estiver aberta.
    }
  }, [itens])

  const alternar = useCallback(
    (oferta) => {
      if (itens.some((item) => item.id === oferta.id)) {
        setItens(itens.filter((item) => item.id !== oferta.id))
        return
      }
      if (itens.length > 0 && itens[0].tipo !== oferta.tipo) {
        avisar('Só dá para comparar ofertas do mesmo tipo. Limpe a seleção para comparar outro tipo.', 'aviso')
        return
      }
      if (itens.length >= LIMITE_COMPARACAO) {
        avisar(`Você pode comparar no máximo ${LIMITE_COMPARACAO} ofertas por vez.`, 'aviso')
        return
      }
      setItens([...itens, { id: oferta.id, tipo: oferta.tipo, titulo: oferta.titulo }])
    },
    [itens, avisar],
  )

  const remover = useCallback((id) => setItens((lista) => lista.filter((item) => item.id !== id)), [])
  const limpar = useCallback(() => setItens([]), [])

  const valor = useMemo(
    () => ({ itens, alternar, remover, limpar, selecionada: (id) => itens.some((item) => item.id === id) }),
    [itens, alternar, remover, limpar],
  )

  return <CompararContext.Provider value={valor}>{children}</CompararContext.Provider>
}

export const useComparar = () => useContext(CompararContext)
