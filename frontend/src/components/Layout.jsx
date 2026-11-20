import { useEffect } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Scale, X } from 'lucide-react'
import { LIMITE_COMPARACAO, useComparar } from '../contexts/CompararContext.jsx'
import { cx } from '../lib/formato.js'
import { TIPOS_OFERTA } from '../lib/oferta.js'
import Cabecalho from './Cabecalho.jsx'
import Marca from './Marca.jsx'
import { Botao } from './ui.jsx'

function BarraComparar() {
  const { itens, remover, limpar } = useComparar()
  const navigate = useNavigate()

  return (
    <aside
      aria-label="Ofertas selecionadas para comparar"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-petroleo-900 text-white shadow-flutuante"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6 lg:px-8">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Scale aria-hidden="true" className="size-5 text-sol-300" />
          <span aria-live="polite">
            {itens.length} de {LIMITE_COMPARACAO} {TIPOS_OFERTA[itens[0].tipo]?.plural.toLowerCase() ?? 'ofertas'} para comparar
          </span>
        </p>
        <ul className="hidden min-w-0 flex-1 flex-wrap gap-2 md:flex">
          {itens.map((item) => (
            <li key={item.id} className="flex max-w-56 items-center gap-1 rounded-full bg-white/12 py-1 pr-1 pl-3 text-xs font-medium">
              <span className="truncate">{item.titulo}</span>
              <button
                type="button"
                onClick={() => remover(item.id)}
                aria-label={`Tirar ${item.titulo} da comparação`}
                className="rounded-full p-1 hover:bg-white/20"
              >
                <X aria-hidden="true" className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={limpar} className="btn btn-sm text-white hover:bg-white/15">
            Limpar
          </button>
          <Botao
            variante="acento"
            tamanho="sm"
            disabled={itens.length < 2}
            onClick={() => navigate(`/comparar?ids=${itens.map((item) => item.id).join(',')}`)}
          >
            Comparar
          </Botao>
        </div>
        {itens.length < 2 && <p className="w-full text-xs text-petroleo-100">Selecione pelo menos 2 ofertas do mesmo tipo.</p>}
      </div>
    </aside>
  )
}

function Rodape() {
  return (
    <footer className="mt-16 bg-petroleo-950 text-petroleo-100">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
        <div>
          <Marca clara />
          <p className="mt-4 max-w-sm text-sm leading-relaxed">
            Passagens, hospedagens, passeios e roteiros num só lugar, ligando o viajante direto ao pequeno fornecedor.
          </p>
        </div>
        <nav aria-label="Rodapé: explorar">
          <h2 className="font-display text-sm font-bold tracking-wide text-white uppercase">Explorar</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link to="/passagens" className="hover:text-white hover:underline">
                Passagens
              </Link>
            </li>
            <li>
              <Link to="/hospedagens" className="hover:text-white hover:underline">
                Hospedagens
              </Link>
            </li>
            <li>
              <Link to="/passeios" className="hover:text-white hover:underline">
                Passeios
              </Link>
            </li>
            <li>
              <Link to="/assistente" className="hover:text-white hover:underline">
                Assistente de roteiro com IA
              </Link>
            </li>
          </ul>
        </nav>
        <div>
          <h2 className="font-display text-sm font-bold tracking-wide text-white uppercase">Sobre este MVP</h2>
          <p className="mt-3 text-sm leading-relaxed">
            Projeto acadêmico da UCSAL (Tópicos Avançados em Programação). Não há pagamento na plataforma: a reserva é
            solicitada aqui e o pagamento é combinado direto com o fornecedor.
          </p>
        </div>
      </div>
      <div className="border-t border-white/10 px-4 py-5 text-center text-xs text-petroleo-200">
        ViaJá · Todos os preços em Reais (BRL)
      </div>
    </footer>
  )
}

export default function Layout() {
  const { pathname } = useLocation()
  const { itens } = useComparar()
  const mostrarBarra = itens.length > 0 && pathname !== '/comparar'

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className={cx('flex min-h-dvh flex-col', mostrarBarra && 'pb-24')}>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[80] focus:rounded-full focus:bg-petroleo-900 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Pular para o conteúdo
      </a>
      <Cabecalho />
      <main id="conteudo" tabIndex={-1} className="flex-1 outline-none">
        <Outlet />
      </main>
      <Rodape />
      {mostrarBarra && <BarraComparar />}
    </div>
  )
}
