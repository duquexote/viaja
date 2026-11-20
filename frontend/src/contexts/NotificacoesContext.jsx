import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { notificacoes } from '../api/index.js'
import { useAuth } from './AuthContext.jsx'

const NotificacoesContext = createContext({ naoLidas: 0, atualizar: () => {} })

const INTERVALO_MS = 30000

/** Contador de notificações não lidas do sino do cabeçalho (consulta leve e periódica). */
export function NotificacoesProvider({ children }) {
  const { usuario } = useAuth()
  const usuarioId = usuario?.id ?? null
  const [naoLidas, setNaoLidas] = useState(0)

  const atualizar = useCallback(async () => {
    if (!usuarioId) {
      setNaoLidas(0)
      return
    }
    try {
      const resposta = await notificacoes.naoLidas()
      setNaoLidas(resposta?.total ?? 0)
    } catch {
      // Falha passageira: mantém o último valor conhecido.
    }
  }, [usuarioId])

  useEffect(() => {
    atualizar()
    if (!usuarioId) return undefined
    const temporizador = setInterval(() => {
      if (!document.hidden) atualizar()
    }, INTERVALO_MS)
    return () => clearInterval(temporizador)
  }, [usuarioId, atualizar])

  const valor = useMemo(() => ({ naoLidas, atualizar }), [naoLidas, atualizar])

  return <NotificacoesContext.Provider value={valor}>{children}</NotificacoesContext.Provider>
}

export const useNotificacoes = () => useContext(NotificacoesContext)
