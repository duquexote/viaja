import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Bell, ChevronDown, LogOut, Menu, Sparkles, UserRound, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useAvisos } from '../contexts/AvisosContext.jsx'
import { useNotificacoes } from '../contexts/NotificacoesContext.jsx'
import { cx } from '../lib/formato.js'
import { PERFIS } from '../lib/oferta.js'
import Marca from './Marca.jsx'

const BUSCAS = [
  { para: '/passagens', rotulo: 'Passagens' },
  { para: '/hospedagens', rotulo: 'Hospedagens' },
  { para: '/passeios', rotulo: 'Passeios' },
]
const ASSISTENTE = { para: '/assistente', rotulo: 'Assistente IA', icone: Sparkles }

function linksDoPerfil(usuario) {
  if (!usuario) return [...BUSCAS, ASSISTENTE]
  if (usuario.perfil === 'FORNECEDOR') return [{ para: '/fornecedor', rotulo: 'Painel do fornecedor' }, ...BUSCAS]
  if (usuario.perfil === 'ADMINISTRADOR') return [{ para: '/admin', rotulo: 'Painel administrativo' }, ...BUSCAS]
  return [
    ...BUSCAS,
    ASSISTENTE,
    { para: '/itinerarios', rotulo: 'Itinerários' },
    { para: '/reservas', rotulo: 'Reservas' },
  ]
}

function classeDoLink({ isActive }) {
  return cx(
    'inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold whitespace-nowrap transition-colors',
    isActive ? 'bg-petroleo-800 text-white' : 'text-petroleo-900 hover:bg-petroleo-800/10',
  )
}

function Sino({ total }) {
  return (
    <Link
      to="/notificacoes"
      className="relative grid size-11 place-items-center rounded-full text-petroleo-900 hover:bg-petroleo-800/10"
      aria-label={total > 0 ? `Notificações: ${total} não lidas` : 'Notificações'}
    >
      <Bell aria-hidden="true" className="size-5" />
      {total > 0 && (
        <span
          aria-hidden="true"
          className="absolute top-1 right-1 grid min-w-5 place-items-center rounded-full bg-coral-500 px-1 text-[0.6875rem] leading-5 font-bold text-petroleo-950"
        >
          {total > 9 ? '9+' : total}
        </span>
      )}
    </Link>
  )
}

function MenuDoUsuario({ usuario, aoSair }) {
  const [aberto, setAberto] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!aberto) return undefined
    const fecharFora = (evento) => {
      if (!ref.current?.contains(evento.target)) setAberto(false)
    }
    const fecharNoEsc = (evento) => {
      if (evento.key === 'Escape') setAberto(false)
    }
    document.addEventListener('mousedown', fecharFora)
    document.addEventListener('keydown', fecharNoEsc)
    return () => {
      document.removeEventListener('mousedown', fecharFora)
      document.removeEventListener('keydown', fecharNoEsc)
    }
  }, [aberto])

  const primeiroNome = usuario.nome?.split(' ')[0] ?? 'Conta'

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={aberto}
        aria-haspopup="true"
        onClick={() => setAberto((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full border border-petroleo-900/15 bg-white py-1.5 pr-3 pl-1.5 text-sm font-semibold text-petroleo-900 hover:border-petroleo-900/40"
      >
        <span className="grid size-8 place-items-center rounded-full bg-petroleo-800 text-white">
          <UserRound aria-hidden="true" className="size-4" />
        </span>
        <span className="max-w-28 truncate">{primeiroNome}</span>
        <ChevronDown aria-hidden="true" className={cx('size-4 transition-transform', aberto && 'rotate-180')} />
      </button>
      {aberto && (
        <div className="absolute right-0 z-50 mt-2 w-64 animate-surgir rounded-2xl border border-petroleo-900/10 bg-white p-2 shadow-flutuante">
          <div className="border-b border-petroleo-900/10 px-3 pt-2 pb-3">
            <p className="truncate font-bold text-petroleo-950">{usuario.nome}</p>
            <p className="truncate text-xs text-tinta-suave">{usuario.email}</p>
            <p className="mt-1.5 inline-block rounded-full bg-areia-100 px-2 py-0.5 text-xs font-semibold text-petroleo-900">
              {PERFIS[usuario.perfil] ?? usuario.perfil}
            </p>
          </div>
          <Link
            to="/perfil"
            onClick={() => setAberto(false)}
            className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-petroleo-900 hover:bg-petroleo-800/10"
          >
            <UserRound aria-hidden="true" className="size-4" />
            Meu perfil
          </Link>
          <button
            type="button"
            onClick={aoSair}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-800 hover:bg-red-50"
          >
            <LogOut aria-hidden="true" className="size-4" />
            Sair
          </button>
        </div>
      )}
    </div>
  )
}

export default function Cabecalho() {
  const { usuario, sair } = useAuth()
  const { naoLidas } = useNotificacoes()
  const { avisar } = useAvisos()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [menuAberto, setMenuAberto] = useState(false)
  const links = linksDoPerfil(usuario)

  // Fecha o menu do celular ao trocar de página.
  useEffect(() => {
    setMenuAberto(false)
  }, [pathname])

  function encerrarSessao() {
    sair()
    setMenuAberto(false)
    avisar('Você saiu da sua conta.')
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-petroleo-900/10 bg-areia-50/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link to="/" aria-label="ViaJá, página inicial" className="rounded-xl">
          <Marca />
        </Link>

        <nav aria-label="Principal" className="ml-4 hidden items-center gap-1 xl:flex">
          {links.map(({ para, rotulo, icone: Icone }) => (
            <NavLink key={para} to={para} className={classeDoLink}>
              {Icone && <Icone aria-hidden="true" className="size-4" />}
              {rotulo}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          {usuario ? (
            <>
              <Sino total={naoLidas} />
              <div className="hidden xl:block">
                <MenuDoUsuario usuario={usuario} aoSair={encerrarSessao} />
              </div>
            </>
          ) : (
            <div className="hidden items-center gap-2 xl:flex">
              <Link to="/entrar" className="btn btn-fantasma">
                Entrar
              </Link>
              <Link to="/cadastro" className="btn btn-primario">
                Criar conta
              </Link>
            </div>
          )}

          <button
            type="button"
            className="grid size-11 place-items-center rounded-full text-petroleo-900 hover:bg-petroleo-800/10 xl:hidden"
            aria-expanded={menuAberto}
            aria-controls="menu-celular"
            aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
            onClick={() => setMenuAberto((v) => !v)}
          >
            {menuAberto ? <X aria-hidden="true" className="size-6" /> : <Menu aria-hidden="true" className="size-6" />}
          </button>
        </div>
      </div>

      <div
        id="menu-celular"
        hidden={!menuAberto}
        className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-petroleo-900/10 bg-areia-50 xl:hidden"
      >
        <nav aria-label="Menu" className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4 sm:px-6">
          {links.map(({ para, rotulo, icone: Icone }) => (
            <NavLink
              key={para}
              to={para}
              className={({ isActive }) =>
                cx(
                  'flex items-center gap-2 rounded-2xl px-4 py-3 text-base font-semibold',
                  isActive ? 'bg-petroleo-800 text-white' : 'text-petroleo-900 hover:bg-petroleo-800/10',
                )
              }
            >
              {Icone && <Icone aria-hidden="true" className="size-5" />}
              {rotulo}
            </NavLink>
          ))}

          <div className="mt-3 border-t border-petroleo-900/10 pt-4">
            {usuario ? (
              <>
                <p className="px-4 text-sm text-tinta-suave">
                  Conectado como <strong className="text-petroleo-950">{usuario.nome}</strong> (
                  {PERFIS[usuario.perfil] ?? usuario.perfil})
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <Link to="/perfil" className="btn btn-contorno">
                    <UserRound aria-hidden="true" className="size-4" />
                    Meu perfil
                  </Link>
                  <button type="button" onClick={encerrarSessao} className="btn btn-perigo-contorno">
                    <LogOut aria-hidden="true" className="size-4" />
                    Sair
                  </button>
                </div>
              </>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                <Link to="/entrar" className="btn btn-contorno">
                  Entrar
                </Link>
                <Link to="/cadastro" className="btn btn-primario">
                  Criar conta
                </Link>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  )
}
