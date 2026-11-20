import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { definirAoExpirar, gravarSessao, lerSessao } from '../api/client.js'
import { auth, usuarios } from '../api/index.js'

const AuthContext = createContext(null)

/** Sessão do usuário: token JWT + dados do usuário, guardados no localStorage. */
export function AuthProvider({ children }) {
  const [sessao, setSessao] = useState(() => lerSessao())
  const navigate = useNavigate()

  const entrar = useCallback(async (email, senha) => {
    const resposta = await auth.login({ email, senha })
    const nova = { token: resposta.token, usuario: resposta.usuario }
    gravarSessao(nova)
    setSessao(nova)
    return resposta.usuario
  }, [])

  const sair = useCallback(() => {
    gravarSessao(null)
    setSessao(null)
  }, [])

  const atualizarUsuario = useCallback((usuario) => {
    const atual = lerSessao()
    if (!atual) return
    const nova = { ...atual, usuario }
    gravarSessao(nova)
    setSessao(nova)
  }, [])

  const recarregarUsuario = useCallback(async () => {
    const usuario = await usuarios.eu()
    atualizarUsuario(usuario)
    return usuario
  }, [atualizarUsuario])

  // Token recusado pelo servidor (expirado): encerra a sessão e leva ao login.
  useEffect(() => {
    definirAoExpirar(() => {
      setSessao(null)
      navigate('/entrar', { replace: true, state: { expirou: true } })
    })
    return () => definirAoExpirar(null)
  }, [navigate])

  // Ao abrir o site com sessão salva, atualiza os dados (ex.: fornecedor que acabou de ser aprovado).
  const token = sessao?.token ?? null
  useEffect(() => {
    if (token) recarregarUsuario().catch(() => {})
  }, [token, recarregarUsuario])

  const valor = useMemo(
    () => ({ usuario: sessao?.usuario ?? null, entrar, sair, atualizarUsuario, recarregarUsuario }),
    [sessao, entrar, sair, atualizarUsuario, recarregarUsuario],
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)

/** Para onde levar cada perfil logo após o login. */
export function inicioDoPerfil(perfil) {
  if (perfil === 'FORNECEDOR') return '/fornecedor'
  if (perfil === 'ADMINISTRADOR') return '/admin'
  return '/'
}
