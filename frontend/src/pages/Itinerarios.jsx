import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarDays, CircleCheck, Map as IconeMapa, Plus, Sparkles, TriangleAlert, Users } from 'lucide-react'
import { itinerarios } from '../api/index.js'
import ItinerarioFormModal from '../components/ItinerarioFormModal.jsx'
import { Botao, Estado, LinkBotao, Pagina, Selo, Vazio } from '../components/ui.jsx'
import { fmtDataCurta, moeda, plural } from '../lib/formato.js'
import { useDados } from '../lib/hooks.js'

function CartaoDeItinerario({ itinerario }) {
  const conflitos = itinerario.conflitos?.length ?? 0
  const itens = itinerario.itens?.length ?? 0
  return (
    <Link
      to={`/itinerarios/${itinerario.id}`}
      className="cartao group flex h-full flex-col p-6 transition-colors hover:border-petroleo-700/50"
    >
      <div className="flex flex-wrap items-center gap-2">
        {itinerario.geradoPorIA && (
          <Selo icone={Sparkles} className="bg-coral-100 text-coral-800">
            Sugerido pelo assistente
          </Selo>
        )}
        {conflitos > 0 ? (
          <Selo icone={TriangleAlert} className="bg-red-100 text-red-900">
            {plural(conflitos, 'conflito', 'conflitos')}
          </Selo>
        ) : (
          itens > 0 && (
            <Selo icone={CircleCheck} className="bg-emerald-100 text-emerald-900">
              Datas conferidas
            </Selo>
          )
        )}
      </div>
      <h2 className="mt-3 font-display text-xl leading-snug font-bold break-words text-petroleo-950 group-hover:underline">
        {itinerario.nome}
      </h2>
      <dl className="mt-3 space-y-1.5 text-sm text-tinta">
        <div className="flex items-center gap-2">
          <CalendarDays aria-hidden="true" className="size-4 text-petroleo-600" />
          <dt className="sr-only">Período</dt>
          <dd>
            {fmtDataCurta(itinerario.dataInicio)} a {fmtDataCurta(itinerario.dataFim)} ·{' '}
            {plural(itinerario.totalDias, 'dia', 'dias')}
          </dd>
        </div>
        <div className="flex items-center gap-2">
          <Users aria-hidden="true" className="size-4 text-petroleo-600" />
          <dt className="sr-only">Viajantes e itens</dt>
          <dd>
            {plural(itinerario.pessoas, 'pessoa', 'pessoas')} · {plural(itens, 'item', 'itens')}
          </dd>
        </div>
      </dl>
      <p className="mt-auto pt-5">
        <span className="block text-xs text-tinta-suave">Custo total estimado</span>
        <span className="font-display text-2xl font-extrabold text-petroleo-950">{moeda(itinerario.custoTotal)}</span>
      </p>
    </Link>
  )
}

export default function Itinerarios() {
  const consulta = useDados(() => itinerarios.listar(), [])
  const [criando, setCriando] = useState(false)
  const navigate = useNavigate()

  return (
    <Pagina
      titulo="Meus itinerários"
      descricao="Junte passagens, hospedagens e passeios num roteiro por dia. O ViaJá confere as datas e soma o custo."
      acoes={
        <>
          <LinkBotao to="/assistente" variante="contorno" icone={Sparkles}>
            Pedir roteiro à IA
          </LinkBotao>
          <Botao icone={Plus} onClick={() => setCriando(true)}>
            Novo itinerário
          </Botao>
        </>
      }
    >
      <Estado consulta={consulta} textoCarregando="Carregando seus itinerários…">
        {(lista) =>
          lista.length === 0 ? (
            <Vazio
              icone={IconeMapa}
              titulo="Você ainda não tem itinerários"
              acao={
                <>
                  <Botao icone={Plus} onClick={() => setCriando(true)}>
                    Criar o primeiro
                  </Botao>
                  <LinkBotao to="/assistente" variante="acento" icone={Sparkles}>
                    Pedir roteiro à IA
                  </LinkBotao>
                </>
              }
            >
              Crie um itinerário e vá adicionando ofertas pelas buscas, ou peça uma sugestão pronta ao assistente.
            </Vazio>
          ) : (
            <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {lista.map((itinerario) => (
                <li key={itinerario.id}>
                  <CartaoDeItinerario itinerario={itinerario} />
                </li>
              ))}
            </ul>
          )
        }
      </Estado>

      {criando && (
        <ItinerarioFormModal
          aoFechar={() => setCriando(false)}
          aoSalvar={(novo) => navigate(`/itinerarios/${novo.id}`)}
        />
      )}
    </Pagina>
  )
}
