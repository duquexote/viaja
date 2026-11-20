import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BedDouble,
  Bus,
  CalendarCheck,
  Handshake,
  MapPin,
  Mountain,
  Scale,
  Search,
  Send,
  Sparkles,
  Store,
} from 'lucide-react'
import { Abas, Botao, Entrada, LinkBotao, Selecao } from '../components/ui.jsx'
import { hojeIso } from '../lib/formato.js'
import { useOpcoes, useTitulo } from '../lib/hooks.js'

const ABAS = [
  { id: 'passagens', rotulo: 'Passagens', icone: Bus },
  { id: 'hospedagens', rotulo: 'Hospedagens', icone: BedDouble },
  { id: 'passeios', rotulo: 'Passeios', icone: Mountain },
]

const INICIAL = {
  origem: '',
  destino: '',
  data: '',
  passageiros: '1',
  cidadeHospedagem: '',
  checkin: '',
  checkout: '',
  hospedes: '2',
  cidadePasseio: '',
  dataPasseio: '',
}

function BuscaRapida() {
  const navigate = useNavigate()
  const opcoes = useOpcoes()
  const [aba, setAba] = useState('passagens')
  const [f, setF] = useState(INICIAL)
  const mudar = (campo) => (evento) => setF((atual) => ({ ...atual, [campo]: evento.target.value }))

  function buscar(evento) {
    evento.preventDefault()
    const consulta = new URLSearchParams()
    const incluir = (chave, valor) => valor && consulta.set(chave, valor)
    if (aba === 'passagens') {
      incluir('origem', f.origem)
      incluir('destino', f.destino)
      incluir('data', f.data)
      incluir('passageiros', f.passageiros)
    } else if (aba === 'hospedagens') {
      incluir('cidade', f.cidadeHospedagem)
      incluir('checkin', f.checkin)
      incluir('checkout', f.checkout)
      incluir('hospedes', f.hospedes)
    } else {
      incluir('cidade', f.cidadePasseio)
      incluir('data', f.dataPasseio)
    }
    const texto = consulta.toString()
    navigate(`/${aba}${texto ? `?${texto}` : ''}`)
  }

  return (
    <div className="rounded-4xl bg-white p-4 text-tinta shadow-flutuante sm:p-6">
      <Abas abas={ABAS} atual={aba} aoMudar={setAba} rotulo="O que você procura?" esticar className="sm:w-fit" />

      <form onSubmit={buscar} className="mt-5 grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
        {aba === 'passagens' && (
          <>
            <Selecao rotulo="Saindo de" value={f.origem} onChange={mudar('origem')}>
              <option value="">Qualquer origem</option>
              {opcoes.origens.map((cidade) => (
                <option key={cidade}>{cidade}</option>
              ))}
            </Selecao>
            <Selecao rotulo="Indo para" value={f.destino} onChange={mudar('destino')}>
              <option value="">Qualquer destino</option>
              {opcoes.destinos.map((cidade) => (
                <option key={cidade}>{cidade}</option>
              ))}
            </Selecao>
            <Entrada rotulo="Data" type="date" min={hojeIso()} value={f.data} onChange={mudar('data')} />
            <Entrada
              rotulo="Passageiros"
              type="number"
              min={1}
              max={20}
              value={f.passageiros}
              onChange={mudar('passageiros')}
            />
          </>
        )}
        {aba === 'hospedagens' && (
          <>
            <Selecao rotulo="Cidade" value={f.cidadeHospedagem} onChange={mudar('cidadeHospedagem')}>
              <option value="">Qualquer cidade</option>
              {opcoes.cidades.map((cidade) => (
                <option key={cidade}>{cidade}</option>
              ))}
            </Selecao>
            <Entrada rotulo="Check-in" type="date" min={hojeIso()} value={f.checkin} onChange={mudar('checkin')} />
            <Entrada
              rotulo="Check-out"
              type="date"
              min={f.checkin || hojeIso()}
              value={f.checkout}
              onChange={mudar('checkout')}
            />
            <Entrada rotulo="Hóspedes" type="number" min={1} max={20} value={f.hospedes} onChange={mudar('hospedes')} />
          </>
        )}
        {aba === 'passeios' && (
          <>
            <Selecao
              rotulo="Cidade"
              value={f.cidadePasseio}
              onChange={mudar('cidadePasseio')}
              className="lg:col-span-2"
            >
              <option value="">Qualquer cidade</option>
              {opcoes.cidades.map((cidade) => (
                <option key={cidade}>{cidade}</option>
              ))}
            </Selecao>
            <Entrada
              rotulo="Data"
              type="date"
              min={hojeIso()}
              value={f.dataPasseio}
              onChange={mudar('dataPasseio')}
              className="lg:col-span-2"
            />
          </>
        )}
        <Botao type="submit" variante="acento" tamanho="lg" icone={Search} className="sm:col-span-2 lg:col-span-1">
          Buscar
        </Botao>
      </form>
    </div>
  )
}

const PASSOS = [
  {
    icone: Search,
    titulo: 'Pesquise',
    texto: 'Passagens aéreas e de ônibus, hospedagens e passeios de fornecedores locais, tudo com preço em Reais.',
  },
  {
    icone: Scale,
    titulo: 'Compare',
    texto: 'Coloque até 4 ofertas do mesmo tipo lado a lado e veja preço, horários, nota e comodidades.',
  },
  {
    icone: CalendarCheck,
    titulo: 'Monte o roteiro',
    texto: 'Organize a viagem por dia. O ViaJá avisa quando o check-in não bate com a chegada do transporte.',
  },
  {
    icone: Send,
    titulo: 'Solicite a reserva',
    texto: 'Envie o pedido sem pagar nada aqui. O fornecedor confirma em até 48 horas e você acompanha tudo.',
  },
]

const ROTEIRO_EXEMPLO = [
  { dia: 'Dia 1', itens: ['07:00 · Ônibus Salvador → Lençóis', '14:00 · Check-in na pousada'] },
  { dia: 'Dia 2', itens: ['08:30 · Trilha com banho de cachoeira'] },
  { dia: 'Dia 3', itens: ['09:00 · Grutas e poço de águas azuis'] },
  { dia: 'Dia 4', itens: ['07:30 · Ônibus Lençóis → Salvador'] },
]

export default function Inicio() {
  useTitulo(null)
  const opcoes = useOpcoes()

  return (
    <>
      {/* Abertura */}
      <section className="relative isolate bg-petroleo-900 text-white">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-20 -right-20 size-44 rounded-full bg-linear-to-br from-sol-300 via-coral-400 to-coral-600 sm:-top-24 sm:-right-16 sm:size-96 lg:right-10 lg:size-[30rem]" />
          <div className="absolute -top-40 -right-40 hidden size-[46rem] rounded-full border border-white/10 lg:block" />
          <div className="absolute -bottom-32 -left-32 size-96 rounded-full bg-petroleo-700/40 blur-3xl" />
          <svg viewBox="0 0 1440 90" preserveAspectRatio="none" className="absolute inset-x-0 -bottom-px h-10 w-full sm:h-20">
            <path
              d="M0 55c120-30 240-42 360-28s240 46 360 46 240-44 360-52 240 6 360 22v47H0Z"
              className="fill-areia-50"
            />
          </svg>
        </div>

        <div className="mx-auto max-w-7xl px-4 pt-12 pb-24 sm:px-6 sm:pt-16 sm:pb-36 lg:px-8 lg:pt-20">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-bold tracking-widest text-sol-300 uppercase">
            <MapPin aria-hidden="true" className="size-3.5" />
            Bahia de ponta a ponta
          </p>
          <h1 className="mt-5 max-w-3xl font-display text-4xl leading-[1.05] font-extrabold tracking-tight sm:text-6xl">
            Sua viagem inteira <span className="text-sol-300 sm:block">num só lugar.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-petroleo-100 sm:text-lg">
            Passagens, hospedagens e passeios de pequenos fornecedores locais. Monte o roteiro, confira as datas e
            solicite a reserva sem abrir dez abas.
          </p>

          <div className="mt-9">
            <BuscaRapida />
          </div>
        </div>
      </section>

      {/* Assistente de IA */}
      <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8" aria-labelledby="titulo-assistente">
        <div className="grid overflow-hidden rounded-4xl bg-linear-to-br from-coral-100 via-areia-100 to-sol-200 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="p-6 sm:p-10">
            <p className="inline-flex items-center gap-2 rounded-full bg-petroleo-900 px-3 py-1.5 text-xs font-bold tracking-wider text-sol-300 uppercase">
              <Sparkles aria-hidden="true" className="size-3.5" />
              Assistente de roteiro com IA
            </p>
            <h2 id="titulo-assistente" className="mt-4 font-display text-3xl leading-tight font-extrabold text-petroleo-950 sm:text-4xl">
              Diga para onde, quando e quanto. O roteiro sai em segundos.
            </h2>
            <p className="mt-4 max-w-lg leading-relaxed text-tinta">
              O assistente monta um itinerário dia a dia usando só ofertas reais cadastradas no ViaJá, dentro do seu
              orçamento. Depois é só ajustar, salvar e solicitar as reservas.
            </p>
            <LinkBotao to="/assistente" tamanho="lg" className="mt-7">
              Pedir um roteiro
              <ArrowRight aria-hidden="true" className="size-5" />
            </LinkBotao>
          </div>
          <div className="relative p-6 sm:p-10 lg:pl-0" aria-hidden="true">
            <div className="rounded-3xl bg-white p-5 shadow-flutuante sm:rotate-1 sm:p-6">
              <p className="text-xs font-bold tracking-wider text-coral-700 uppercase">Exemplo de roteiro</p>
              <p className="mt-1 font-display text-lg font-bold text-petroleo-950">Chapada Diamantina em 4 dias</p>
              <ol className="mt-4 space-y-3">
                {ROTEIRO_EXEMPLO.map(({ dia, itens }) => (
                  <li key={dia} className="flex gap-3">
                    <span className="mt-0.5 h-fit shrink-0 rounded-full bg-petroleo-800 px-2.5 py-1 text-xs font-bold text-white">
                      {dia}
                    </span>
                    <span className="space-y-1 text-sm text-tinta">
                      {itens.map((item) => (
                        <span key={item} className="block">
                          {item}
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 lg:px-8" aria-labelledby="titulo-como-funciona">
        <h2 id="titulo-como-funciona" className="font-display text-3xl font-extrabold tracking-tight text-petroleo-950">
          Como funciona
        </h2>
        <p className="mt-2 max-w-2xl text-tinta-suave">Do primeiro clique à avaliação depois da viagem, em quatro passos.</p>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PASSOS.map(({ icone: Icone, titulo, texto }, indice) => (
            <li key={titulo} className="cartao relative p-6">
              <span className="absolute top-5 right-6 font-display text-4xl font-extrabold text-petroleo-900/10" aria-hidden="true">
                {indice + 1}
              </span>
              <span className="grid size-12 place-items-center rounded-2xl bg-petroleo-800 text-sol-300">
                <Icone aria-hidden="true" className="size-6" />
              </span>
              <h3 className="mt-4 font-display text-xl font-bold text-petroleo-950">{titulo}</h3>
              <p className="mt-2 text-sm leading-relaxed text-tinta-suave">{texto}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Destinos */}
      {opcoes.cidades.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 lg:px-8" aria-labelledby="titulo-destinos">
          <h2 id="titulo-destinos" className="font-display text-3xl font-extrabold tracking-tight text-petroleo-950">
            Para onde vamos?
          </h2>
          <p className="mt-2 text-tinta-suave">Destinos com hospedagens e passeios cadastrados agora.</p>
          <ul className="mt-6 flex flex-wrap gap-3">
            {opcoes.cidades.map((cidade) => (
              <li key={cidade}>
                <Link
                  to={`/hospedagens?cidade=${encodeURIComponent(cidade)}`}
                  className="inline-flex items-center gap-2 rounded-full border border-petroleo-900/15 bg-white px-5 py-3 font-semibold text-petroleo-900 shadow-cartao transition-colors hover:border-coral-500 hover:text-coral-700"
                >
                  <MapPin aria-hidden="true" className="size-4 text-coral-600" />
                  {cidade}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Fornecedores */}
      <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 lg:px-8" aria-labelledby="titulo-fornecedores">
        <div className="relative isolate overflow-hidden rounded-4xl bg-petroleo-900 p-6 text-white sm:p-10">
          <div aria-hidden="true" className="absolute -right-16 -bottom-24 -z-10 size-72 rounded-full bg-petroleo-600/50" />
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-2xl">
              <p className="inline-flex items-center gap-2 text-xs font-bold tracking-widest text-sol-300 uppercase">
                <Store aria-hidden="true" className="size-4" />
                Para fornecedores
              </p>
              <h2 id="titulo-fornecedores" className="mt-3 font-display text-2xl leading-tight font-extrabold sm:text-3xl">
                Tem uma pousada, uma empresa de ônibus ou é guia local?
              </h2>
              <p className="mt-3 leading-relaxed text-petroleo-100">
                Cadastre suas ofertas em poucos minutos, sem custo de entrada, e responda às solicitações de reserva
                pelo painel.
              </p>
            </div>
            <LinkBotao to="/cadastro?perfil=FORNECEDOR" variante="acento" tamanho="lg" icone={Handshake}>
              Quero divulgar minhas ofertas
            </LinkBotao>
          </div>
        </div>
      </section>
    </>
  )
}
