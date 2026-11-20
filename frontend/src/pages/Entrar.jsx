import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { FlaskConical, LogIn } from 'lucide-react'
import Marca from '../components/Marca.jsx'
import { Alerta, Botao, Entrada } from '../components/ui.jsx'
import { inicioDoPerfil, useAuth } from '../contexts/AuthContext.jsx'
import { useTitulo } from '../lib/hooks.js'

// Contas criadas pela base de demonstração do back-end. Só aparecem em desenvolvimento.
const SENHA_DEMO = 'viaja123'
const CONTAS_DEMO = [
  { email: 'ana@viaja.com', rotulo: 'Ana', papel: 'Viajante' },
  { email: 'pousada@viaja.com', rotulo: 'Pousada', papel: 'Fornecedor' },
  { email: 'onibus@viaja.com', rotulo: 'Ônibus', papel: 'Fornecedor' },
  { email: 'guia@viaja.com', rotulo: 'Guia', papel: 'Fornecedor' },
  { email: 'novo@viaja.com', rotulo: 'Novo', papel: 'Fornecedor pendente' },
  { email: 'admin@viaja.com', rotulo: 'Admin', papel: 'Administrador' },
]

export function MolduraDeAcesso({ titulo, subtitulo, children, rodape }) {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:py-16">
      <aside className="relative isolate hidden overflow-hidden rounded-4xl bg-petroleo-900 p-10 text-white lg:block">
        <div aria-hidden="true" className="absolute -top-16 -right-16 -z-10 size-64 rounded-full bg-linear-to-br from-sol-300 via-coral-400 to-coral-600" />
        <div aria-hidden="true" className="absolute -bottom-24 -left-20 -z-10 size-72 rounded-full bg-petroleo-700/50" />
        <Marca clara />
        <p className="mt-24 font-display text-3xl leading-tight font-extrabold">
          Planeje a viagem inteira com quem conhece o destino.
        </p>
        <ul className="mt-6 space-y-3 text-petroleo-100">
          <li>Busca de passagens, hospedagens e passeios</li>
          <li>Itinerário por dia com checagem de datas</li>
          <li>Roteiro sugerido por IA com ofertas reais</li>
          <li>Reserva combinada direto com o fornecedor</li>
        </ul>
      </aside>

      <section className="cartao p-6 sm:p-9">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-petroleo-950">{titulo}</h1>
        {subtitulo && <p className="mt-2 text-tinta-suave">{subtitulo}</p>}
        <div className="mt-7">{children}</div>
        {rodape && <div className="mt-7 border-t border-petroleo-900/10 pt-5 text-sm text-tinta-suave">{rodape}</div>}
      </section>
    </div>
  )
}

export default function Entrar() {
  useTitulo('Entrar')
  const { usuario, entrar } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState(null)

  if (usuario) return <Navigate to={inicioDoPerfil(usuario.perfil)} replace />

  async function enviar(evento) {
    evento.preventDefault()
    setEnviando(true)
    setErro(null)
    try {
      const logado = await entrar(email.trim(), senha)
      const voltarPara = logado.perfil === 'VIAJANTE' ? location.state?.de : null
      navigate(voltarPara ?? inicioDoPerfil(logado.perfil), { replace: true })
    } catch (falha) {
      setErro(falha.message)
      setEnviando(false)
    }
  }

  return (
    <MolduraDeAcesso
      titulo="Entrar"
      subtitulo="Acesse sua conta para montar itinerários, solicitar reservas ou gerenciar suas ofertas."
      rodape={
        <p>
          Ainda não tem conta?{' '}
          <Link to="/cadastro" className="elo">
            Criar conta
          </Link>
        </p>
      }
    >
      {location.state?.expirou && (
        <Alerta tipo="aviso" className="mb-5">
          Sua sessão expirou. Entre de novo para continuar.
        </Alerta>
      )}
      {location.state?.de && !location.state?.expirou && (
        <Alerta tipo="info" className="mb-5">
          Entre na sua conta para acessar essa página.
        </Alerta>
      )}
      {location.state?.confirmado && (
        <Alerta tipo="sucesso" className="mb-5">
          E-mail confirmado. Agora é só entrar.
        </Alerta>
      )}

      <form onSubmit={enviar} className="space-y-5">
        <Entrada
          rotulo="E-mail"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(evento) => setEmail(evento.target.value)}
          required
        />
        <Entrada
          rotulo="Senha"
          type="password"
          autoComplete="current-password"
          value={senha}
          onChange={(evento) => setSenha(evento.target.value)}
          required
        />
        {erro && <Alerta tipo="erro">{erro}</Alerta>}
        <Botao type="submit" tamanho="lg" icone={LogIn} carregando={enviando} className="w-full">
          Entrar
        </Botao>
      </form>

      {import.meta.env.DEV && (
        <div className="mt-7 rounded-2xl border border-dashed border-petroleo-900/30 bg-areia-100 p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-petroleo-950">
            <FlaskConical aria-hidden="true" className="size-4 text-coral-700" />
            Contas de demonstração
          </p>
          <p className="mt-1 text-xs text-tinta-suave">
            Visível só em desenvolvimento. Clique para preencher e depois em Entrar.
          </p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {CONTAS_DEMO.map((conta) => (
              <li key={conta.email}>
                <button
                  type="button"
                  onClick={() => {
                    setEmail(conta.email)
                    setSenha(SENHA_DEMO)
                    setErro(null)
                  }}
                  className="w-full rounded-xl border border-petroleo-900/15 bg-white px-3 py-2 text-left hover:border-petroleo-800/60"
                >
                  <span className="block text-sm font-semibold text-petroleo-950">{conta.papel}</span>
                  <span className="block truncate text-xs text-tinta-suave">{conta.email}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </MolduraDeAcesso>
  )
}
