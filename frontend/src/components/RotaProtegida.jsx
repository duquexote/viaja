import { Navigate, useLocation } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { inicioDoPerfil, useAuth } from '../contexts/AuthContext.jsx'
import { useTitulo } from '../lib/hooks.js'
import { PERFIS } from '../lib/oferta.js'
import { LinkBotao, Vazio } from './ui.jsx'

function AcessoRestrito({ perfis, usuario }) {
  useTitulo('Acesso restrito')
  const nomes = perfis.map((perfil) => PERFIS[perfil]?.toLowerCase() ?? perfil).join(' ou ')
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <Vazio
        icone={Lock}
        titulo="Esta área é de outro perfil"
        acao={<LinkBotao to={inicioDoPerfil(usuario.perfil)}>Ir para a minha área</LinkBotao>}
      >
        Esta página é exclusiva para o perfil {nomes}. Você está conectado como{' '}
        {PERFIS[usuario.perfil]?.toLowerCase() ?? usuario.perfil}.
      </Vazio>
    </div>
  )
}

/** Exige login e, se `perfis` for informado, um dos perfis listados. */
export default function RotaProtegida({ perfis, children }) {
  const { usuario } = useAuth()
  const location = useLocation()

  if (!usuario) {
    return <Navigate to="/entrar" replace state={{ de: location.pathname + location.search }} />
  }
  if (perfis && !perfis.includes(usuario.perfil)) {
    return <AcessoRestrito perfis={perfis} usuario={usuario} />
  }
  return children
}
