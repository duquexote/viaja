// Detalhes de uma oferta, com avaliações e pedido de reserva sem pagamento (RF-10).
import { useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarDays,
  CalendarPlus,
  Check,
  Clock,
  MapPin,
  MessageSquareText,
  Scale,
  Send,
  Store,
  Tag,
  Users,
} from 'lucide-react'
import { ofertas, reservas } from '../api/index.js'
import AdicionarItinerarioModal from '../components/AdicionarItinerarioModal.jsx'
import { Trajeto } from '../components/OfertaCard.jsx'
import OfertaFoto from '../components/OfertaFoto.jsx'
import {
  Alerta,
  Botao,
  Carregando,
  Entrada,
  ErroAoCarregar,
  Estrelas,
  LinkBotao,
  NotaMedia,
  Selo,
} from '../components/ui.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useComparar } from '../contexts/CompararContext.jsx'
import { fmtData, fmtDataLonga, fmtHora, hojeIso, moeda, plural } from '../lib/formato.js'
import { useDados, useTitulo } from '../lib/hooks.js'
import {
  custoEstimado,
  quartosNecessarios,
  rotuloHospedagem,
  rotuloTransporte,
  TIPOS_OFERTA,
  unidadeDoPreco,
} from '../lib/oferta.js'

function Ficha({ icone: Icone, rotulo, children }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-areia-100 p-4">
      <Icone aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-petroleo-700" />
      <div className="min-w-0">
        <dt className="text-xs font-semibold tracking-wide text-tinta-suave uppercase">{rotulo}</dt>
        <dd className="mt-0.5 font-semibold break-words text-petroleo-950">{children}</dd>
      </div>
    </div>
  )
}

function FichaTecnica({ oferta }) {
  if (oferta.tipo === 'PASSAGEM') {
    return (
      <>
        <div className="cartao p-5 sm:p-6">
          <Trajeto oferta={oferta} />
        </div>
        <dl className="grid gap-3 sm:grid-cols-2">
          <Ficha icone={CalendarDays} rotulo="Data da viagem">
            {fmtDataLonga(oferta.partida)}
          </Ficha>
          <Ficha icone={Tag} rotulo="Transporte">
            {rotuloTransporte(oferta.tipoTransporte)}
          </Ficha>
          <Ficha icone={Clock} rotulo="Chegada">
            {fmtData(oferta.chegada)} às {fmtHora(oferta.chegada)}
          </Ficha>
          <Ficha icone={Users} rotulo="Assentos livres">
            {oferta.vagas}
          </Ficha>
        </dl>
      </>
    )
  }
  if (oferta.tipo === 'HOSPEDAGEM') {
    return (
      <>
        <dl className="grid gap-3 sm:grid-cols-2">
          <Ficha icone={MapPin} rotulo="Cidade">
            {oferta.cidade}
          </Ficha>
          <Ficha icone={Tag} rotulo="Tipo">
            {rotuloHospedagem(oferta.tipoHospedagem)}
          </Ficha>
          <Ficha icone={Users} rotulo="Capacidade">
            Até {plural(oferta.capacidade ?? 1, 'hóspede', 'hóspedes')} por quarto
          </Ficha>
          <Ficha icone={Check} rotulo="Quartos livres">
            {oferta.vagas}
          </Ficha>
        </dl>
        {oferta.comodidades?.length > 0 && (
          <div>
            <h2 className="font-display text-xl font-bold text-petroleo-950">Comodidades</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {oferta.comodidades.map((comodidade) => (
                <li
                  key={comodidade}
                  className="inline-flex items-center gap-1.5 rounded-full border border-petroleo-900/15 bg-white px-3.5 py-2 text-sm font-medium text-petroleo-900"
                >
                  <Check aria-hidden="true" className="size-4 text-emerald-700" />
                  {comodidade}
                </li>
              ))}
            </ul>
          </div>
        )}
      </>
    )
  }
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      <Ficha icone={MapPin} rotulo="Cidade">
        {oferta.cidade}
      </Ficha>
      <Ficha icone={Tag} rotulo="Categoria">
        {oferta.categoria}
      </Ficha>
      <Ficha icone={CalendarDays} rotulo="Data">
        {fmtDataLonga(oferta.data)}
      </Ficha>
      <Ficha icone={Clock} rotulo="Horário e duração">
        {fmtHora(oferta.horarioInicio)} · {oferta.duracaoHoras} h
      </Ficha>
      <Ficha icone={Users} rotulo="Vagas">
        {oferta.vagas}
      </Ficha>
    </dl>
  )
}

function Avaliacoes({ ofertaId }) {
  const consulta = useDados(() => ofertas.avaliacoes(ofertaId), [ofertaId])
  const lista = consulta.dados ?? []

  return (
    <section aria-labelledby="titulo-avaliacoes">
      <h2 id="titulo-avaliacoes" className="font-display text-xl font-bold text-petroleo-950">
        Avaliações de quem já foi
      </h2>
      <div className="mt-4">
        {consulta.carregando ? (
          <Carregando texto="Carregando avaliações…" className="py-8" />
        ) : consulta.erro ? (
          <ErroAoCarregar mensagem={consulta.erro} aoTentar={consulta.recarregar} />
        ) : lista.length === 0 ? (
          <p className="flex items-center gap-2 rounded-2xl border border-dashed border-petroleo-900/25 p-5 text-sm text-tinta-suave">
            <MessageSquareText aria-hidden="true" className="size-5 shrink-0" />
            Esta oferta ainda não recebeu avaliações.
          </p>
        ) : (
          <ul className="space-y-3">
            {lista.map((avaliacao) => (
              <li key={avaliacao.id} className="cartao p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-petroleo-950">{avaliacao.viajanteNome}</p>
                  <p className="text-xs text-tinta-suave">{fmtData(avaliacao.data)}</p>
                </div>
                <Estrelas nota={avaliacao.nota} className="mt-1" />
                {avaliacao.comentario && <p className="mt-2 text-sm leading-relaxed text-tinta">{avaliacao.comentario}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

function PedidoDeReserva({ oferta }) {
  const { usuario } = useAuth()
  const location = useLocation()
  const [parametros] = useSearchParams()
  const { alternar, selecionada } = useComparar()
  const hospedagem = oferta.tipo === 'HOSPEDAGEM'

  const [pessoas, setPessoas] = useState(parametros.get('pessoas') || '1')
  const [checkin, setCheckin] = useState(parametros.get('checkin') || '')
  const [noites, setNoites] = useState(parametros.get('noites') || '1')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState(null)
  const [reserva, setReserva] = useState(null)
  const [modalAberto, setModalAberto] = useState(false)

  const qtdPessoas = Math.max(1, Number(pessoas) || 1)
  const qtdNoites = Math.max(1, Number(noites) || 1)
  const vagasNecessarias = hospedagem ? quartosNecessarios(oferta, qtdPessoas) : qtdPessoas
  const faltamVagas = vagasNecessarias > oferta.vagas
  const total = custoEstimado(oferta, { pessoas: qtdPessoas, noites: qtdNoites })
  const viajante = usuario?.perfil === 'VIAJANTE'
  const marcada = selecionada(oferta.id)

  async function solicitar(evento) {
    evento.preventDefault()
    setEnviando(true)
    setErro(null)
    try {
      const criada = await reservas.criar({
        ofertaId: oferta.id,
        pessoas: qtdPessoas,
        ...(hospedagem ? { dataInicio: checkin, noites: qtdNoites } : {}),
      })
      setReserva(criada ?? {})
    } catch (falha) {
      setErro(falha.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <aside aria-label="Reserva" className="cartao h-fit p-5 sm:p-6 lg:sticky lg:top-24">
      <p className="font-display text-3xl leading-none font-extrabold text-petroleo-950">{moeda(oferta.preco)}</p>
      <p className="mt-1 text-sm text-tinta-suave">{unidadeDoPreco(oferta)}</p>

      {!oferta.ativa ? (
        <Alerta tipo="aviso" className="mt-5">
          Esta oferta foi desativada pelo fornecedor e não aceita novas reservas.
        </Alerta>
      ) : reserva ? (
        <div className="mt-5 space-y-4">
          <Alerta tipo="sucesso" titulo="Solicitação enviada">
            O fornecedor tem até 48 horas para responder. Você recebe uma notificação assim que houver resposta.
          </Alerta>
          <LinkBotao to="/reservas" className="w-full">
            Ver minhas reservas
          </LinkBotao>
        </div>
      ) : viajante ? (
        <form onSubmit={solicitar} className="mt-5 space-y-4">
          <Entrada
            rotulo={hospedagem ? 'Hóspedes' : oferta.tipo === 'PASSAGEM' ? 'Passageiros' : 'Pessoas'}
            type="number"
            min={1}
            max={50}
            value={pessoas}
            onChange={(evento) => setPessoas(evento.target.value)}
            required
          />
          {hospedagem && (
            <div className="grid grid-cols-2 gap-3">
              <Entrada
                rotulo="Check-in"
                type="date"
                min={hojeIso()}
                value={checkin}
                onChange={(evento) => setCheckin(evento.target.value)}
                required
              />
              <Entrada
                rotulo="Noites"
                type="number"
                min={1}
                max={60}
                value={noites}
                onChange={(evento) => setNoites(evento.target.value)}
                required
              />
            </div>
          )}

          <div className="rounded-2xl bg-areia-100 p-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-semibold text-petroleo-900">Total estimado</span>
              <span className="font-display text-2xl font-extrabold text-petroleo-950">{moeda(total)}</span>
            </div>
            <p className="mt-1 text-xs text-tinta-suave">
              {hospedagem
                ? `${plural(qtdNoites, 'noite', 'noites')} · ${plural(vagasNecessarias, 'quarto', 'quartos')} para ${plural(qtdPessoas, 'hóspede', 'hóspedes')}`
                : `${plural(qtdPessoas, 'pessoa', 'pessoas')} × ${moeda(oferta.preco)}`}
            </p>
          </div>

          {faltamVagas && (
            <Alerta tipo="aviso">
              {oferta.vagas === 0
                ? 'Esta oferta está sem vagas no momento.'
                : `Só ${hospedagem ? plural(oferta.vagas, 'quarto livre', 'quartos livres') : plural(oferta.vagas, 'vaga livre', 'vagas livres')} para esta oferta.`}
            </Alerta>
          )}
          {erro && <Alerta tipo="erro">{erro}</Alerta>}

          <Botao type="submit" variante="acento" tamanho="lg" icone={Send} carregando={enviando} disabled={faltamVagas} className="w-full">
            Solicitar reserva
          </Botao>
          <p className="text-xs leading-relaxed text-tinta-suave">
            Sem pagamento na plataforma: o fornecedor confirma o pedido e vocês combinam o pagamento direto.
          </p>
        </form>
      ) : usuario ? (
        <Alerta tipo="info" className="mt-5">
          Reservas e itinerários são feitos com uma conta de viajante.
        </Alerta>
      ) : (
        <div className="mt-5 space-y-3">
          <p className="text-sm leading-relaxed text-tinta">
            Entre na sua conta para solicitar a reserva ou colocar esta oferta em um itinerário.
          </p>
          <LinkBotao to="/entrar" state={{ de: location.pathname + location.search }} tamanho="lg" className="w-full">
            Entrar para reservar
          </LinkBotao>
          <p className="text-center text-sm text-tinta-suave">
            Não tem conta?{' '}
            <Link to="/cadastro" className="elo">
              Criar conta
            </Link>
          </p>
        </div>
      )}

      <div className="mt-5 grid gap-2 border-t border-petroleo-900/10 pt-5">
        {viajante && oferta.ativa && (
          <Botao variante="contorno" icone={CalendarPlus} onClick={() => setModalAberto(true)}>
            Adicionar ao itinerário
          </Botao>
        )}
        <Botao variante="fantasma" icone={marcada ? Check : Scale} aria-pressed={marcada} onClick={() => alternar(oferta)}>
          {marcada ? 'Na comparação' : 'Comparar com outras'}
        </Botao>
      </div>

      {modalAberto && <AdicionarItinerarioModal oferta={oferta} aoFechar={() => setModalAberto(false)} />}
    </aside>
  )
}

export default function OfertaDetalhe() {
  const { id } = useParams()
  const consulta = useDados(() => ofertas.obter(id), [id])
  const oferta = consulta.dados
  useTitulo(oferta?.titulo ?? 'Oferta')

  if (consulta.carregando && !oferta) return <Carregando texto="Carregando a oferta…" className="py-28" />
  if (consulta.erro || !oferta) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <ErroAoCarregar mensagem={consulta.erro ?? 'Oferta não encontrada.'} aoTentar={consulta.recarregar} />
      </div>
    )
  }

  const tipo = TIPOS_OFERTA[oferta.tipo]

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <Link to={tipo?.rota ?? '/'} className="inline-flex items-center gap-1.5 text-sm font-semibold text-petroleo-700 hover:underline">
        <ArrowLeft aria-hidden="true" className="size-4" />
        Voltar para {tipo?.plural.toLowerCase() ?? 'o início'}
      </Link>

      <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="min-w-0 space-y-7">
          <OfertaFoto oferta={oferta} className="h-48 w-full rounded-4xl sm:h-72" />

          <header>
            <div className="flex flex-wrap items-center gap-2">
              <Selo className="bg-petroleo-800 text-white">{tipo?.rotulo}</Selo>
              <NotaMedia nota={oferta.notaMedia} total={oferta.totalAvaliacoes} />
            </div>
            <h1 className="mt-3 font-display text-3xl leading-tight font-extrabold tracking-tight break-words text-petroleo-950 sm:text-4xl">
              {oferta.titulo}
            </h1>
            <p className="mt-2 flex items-center gap-2 text-tinta-suave">
              <Store aria-hidden="true" className="size-4 shrink-0" />
              Oferecido por <strong className="font-semibold text-petroleo-900">{oferta.fornecedorNome}</strong>
            </p>
          </header>

          <FichaTecnica oferta={oferta} />

          {oferta.descricao && (
            <section aria-labelledby="titulo-sobre">
              <h2 id="titulo-sobre" className="font-display text-xl font-bold text-petroleo-950">
                Sobre esta oferta
              </h2>
              <p className="mt-3 max-w-3xl leading-relaxed whitespace-pre-line text-tinta">{oferta.descricao}</p>
            </section>
          )}

          <Avaliacoes ofertaId={oferta.id} />
        </div>

        <PedidoDeReserva key={oferta.id} oferta={oferta} />
      </div>
    </div>
  )
}
