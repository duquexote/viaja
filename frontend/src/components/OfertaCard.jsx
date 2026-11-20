import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, CalendarPlus, Check, Clock, MapPin, Scale, Users } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useComparar } from '../contexts/CompararContext.jsx'
import { cx, fmtDataExtenso, fmtDuracao, fmtHora, moeda, plural } from '../lib/formato.js'
import { diaSeguinte, rotuloHospedagem, rotuloTransporte, TIPOS_OFERTA, unidadeDoPreco } from '../lib/oferta.js'
import AdicionarItinerarioModal from './AdicionarItinerarioModal.jsx'
import OfertaFoto from './OfertaFoto.jsx'
import { Botao, LinkBotao, NotaMedia, Selo } from './ui.jsx'

function Dado({ icone: Icone, children }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icone aria-hidden="true" className="size-4 shrink-0 text-petroleo-600" />
      {children}
    </span>
  )
}

/** Linha do tempo partida -> chegada de uma passagem. */
export function Trajeto({ oferta, className }) {
  const extra = diaSeguinte(oferta)
  return (
    <div className={cx('flex items-center gap-3', className)}>
      <div>
        <p className="font-display text-xl leading-none font-bold text-petroleo-950">{fmtHora(oferta.partida)}</p>
        <p className="mt-1 text-xs font-medium text-tinta-suave">{oferta.origem}</p>
      </div>
      <div className="flex min-w-12 flex-1 flex-col items-center">
        <span className="text-xs font-semibold text-tinta-suave">{fmtDuracao(oferta.duracaoMinutos)}</span>
        <span aria-hidden="true" className="relative mt-1 block h-0.5 w-full rounded-full bg-petroleo-900/20">
          <span className="absolute top-1/2 left-0 size-2 -translate-y-1/2 rounded-full bg-petroleo-700" />
          <span className="absolute top-1/2 right-0 size-2 -translate-y-1/2 rounded-full bg-coral-500" />
        </span>
      </div>
      <div className="text-right">
        <p className="font-display text-xl leading-none font-bold text-petroleo-950">
          {fmtHora(oferta.chegada)}
          {extra && (
            <sup className="ml-0.5 text-xs font-bold text-coral-700" title="Chega em outro dia">
              {extra}
            </sup>
          )}
        </p>
        <p className="mt-1 text-xs font-medium text-tinta-suave">{oferta.destino}</p>
      </div>
    </div>
  )
}

function Detalhes({ oferta }) {
  if (oferta.tipo === 'PASSAGEM') {
    return (
      <div className="space-y-3">
        <Trajeto oferta={oferta} className="max-w-md" />
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-tinta">
          <Dado icone={CalendarDays}>{fmtDataExtenso(oferta.partida)}</Dado>
          <Dado icone={Users}>{plural(oferta.vagas, 'assento livre', 'assentos livres')}</Dado>
        </div>
      </div>
    )
  }
  if (oferta.tipo === 'HOSPEDAGEM') {
    const comodidades = oferta.comodidades ?? []
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-tinta">
          <Dado icone={MapPin}>{oferta.cidade}</Dado>
          <Dado icone={Users}>Até {plural(oferta.capacidade ?? 1, 'hóspede', 'hóspedes')} por quarto</Dado>
        </div>
        {comodidades.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Comodidades">
            {comodidades.slice(0, 4).map((comodidade) => (
              <li key={comodidade} className="rounded-full bg-areia-100 px-2.5 py-1 text-xs font-medium text-petroleo-900">
                {comodidade}
              </li>
            ))}
            {comodidades.length > 4 && (
              <li className="rounded-full px-1 py-1 text-xs font-medium text-tinta-suave">+{comodidades.length - 4}</li>
            )}
          </ul>
        )}
      </div>
    )
  }
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-tinta">
      <Dado icone={MapPin}>{oferta.cidade}</Dado>
      <Dado icone={CalendarDays}>{fmtDataExtenso(oferta.data)}</Dado>
      <Dado icone={Clock}>
        {fmtHora(oferta.horarioInicio)} · {oferta.duracaoHoras} h de duração
      </Dado>
    </div>
  )
}

function seloDoTipo(oferta) {
  if (oferta.tipo === 'PASSAGEM') return rotuloTransporte(oferta.tipoTransporte)
  if (oferta.tipo === 'HOSPEDAGEM') return rotuloHospedagem(oferta.tipoHospedagem)
  return oferta.categoria
}

/**
 * Cartão de oferta nas listas de busca.
 * `resumo` é uma linha opcional com o total para a busca atual; `consulta` vai na URL de detalhes
 * para pré-preencher o pedido de reserva (pessoas, check-in, noites).
 */
export default function OfertaCard({ oferta, resumo, consulta }) {
  const { usuario } = useAuth()
  const { alternar, selecionada } = useComparar()
  const [modalAberto, setModalAberto] = useState(false)
  const marcada = selecionada(oferta.id)
  const destino = `/ofertas/${oferta.id}${consulta ? `?${consulta}` : ''}`

  return (
    <article className="cartao flex flex-col overflow-hidden sm:flex-row">
      <OfertaFoto oferta={oferta} className="h-32 w-full shrink-0 sm:h-auto sm:w-44 lg:w-52" />

      <div className="flex min-w-0 flex-1 flex-col gap-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-x-5 gap-y-3">
          <div className="min-w-0 flex-1 basis-56">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Selo>{seloDoTipo(oferta) || TIPOS_OFERTA[oferta.tipo]?.rotulo}</Selo>
              <NotaMedia nota={oferta.notaMedia} total={oferta.totalAvaliacoes} />
            </div>
            <h3 className="font-display text-lg leading-snug font-bold break-words text-petroleo-950">
              <Link to={destino} className="hover:underline">
                {oferta.titulo}
              </Link>
            </h3>
            <p className="mt-0.5 text-sm text-tinta-suave">por {oferta.fornecedorNome}</p>
          </div>
          <div className="sm:text-right">
            <p className="font-display text-2xl leading-none font-extrabold text-petroleo-950">{moeda(oferta.preco)}</p>
            <p className="mt-1 text-xs text-tinta-suave">{unidadeDoPreco(oferta)}</p>
            {resumo && <p className="mt-1.5 text-xs font-semibold text-coral-700">{resumo}</p>}
          </div>
        </div>

        <Detalhes oferta={oferta} />

        <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-petroleo-900/8 pt-4">
          <button
            type="button"
            aria-pressed={marcada}
            onClick={() => alternar(oferta)}
            className={cx(
              'btn btn-sm border',
              marcada
                ? 'border-petroleo-800 bg-petroleo-800 text-white'
                : 'border-petroleo-800/30 bg-white text-petroleo-800 hover:border-petroleo-800/70',
            )}
          >
            {marcada ? <Check aria-hidden="true" className="size-4" /> : <Scale aria-hidden="true" className="size-4" />}
            {marcada ? 'Na comparação' : 'Comparar'}
          </button>
          {usuario?.perfil === 'VIAJANTE' && (
            <Botao variante="contorno" tamanho="sm" icone={CalendarPlus} onClick={() => setModalAberto(true)}>
              Adicionar ao itinerário
            </Botao>
          )}
          <LinkBotao to={destino} tamanho="sm" className="ml-auto" aria-label={`Ver detalhes de ${oferta.titulo}`}>
            Ver detalhes
          </LinkBotao>
        </div>
      </div>

      {modalAberto && <AdicionarItinerarioModal oferta={oferta} aoFechar={() => setModalAberto(false)} />}
    </article>
  )
}
