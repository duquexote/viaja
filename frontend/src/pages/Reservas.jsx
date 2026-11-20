// Minhas reservas: acompanhar status, cancelar (RF-12) e avaliar o que já foi usado (RF-13).
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, CircleCheck, Hourglass, MessageSquareText, Star, Ticket, Users, CircleX } from 'lucide-react'
import { reservas } from '../api/index.js'
import {
  Abas,
  Alerta,
  AreaTexto,
  Botao,
  EntradaEstrelas,
  Estado,
  LinkBotao,
  Modal,
  Pagina,
  SeloStatus,
  Vazio,
} from '../components/ui.jsx'
import { useAvisos } from '../contexts/AvisosContext.jsx'
import { fmtDataHora, moeda, plural } from '../lib/formato.js'
import { useDados } from '../lib/hooks.js'
import { iconeDaOferta, resumoDaOferta } from '../lib/oferta.js'

const FILTROS = [
  { id: 'TODAS', rotulo: 'Todas' },
  { id: 'SOLICITADA', rotulo: 'Aguardando' },
  { id: 'CONFIRMADA', rotulo: 'Confirmadas' },
  { id: 'RECUSADA', rotulo: 'Recusadas' },
  { id: 'EXPIRADA', rotulo: 'Expiradas' },
  { id: 'CANCELADA', rotulo: 'Canceladas' },
]

function CancelarModal({ reserva, aoFechar, aoCancelada }) {
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState(null)

  async function confirmar() {
    setEnviando(true)
    setErro(null)
    try {
      aoCancelada(await reservas.cancelar(reserva.id))
    } catch (falha) {
      setErro(falha.message)
      setEnviando(false)
    }
  }

  return (
    <Modal aberto titulo="Cancelar esta reserva?" aoFechar={aoFechar} largura="max-w-md">
      <p className="text-sm leading-relaxed text-tinta">
        Você está cancelando <strong>{reserva.oferta.titulo}</strong>. O fornecedor é avisado e as vagas voltam a ficar
        disponíveis. Como não há pagamento na plataforma, não existe reembolso a calcular.
      </p>
      {erro && (
        <Alerta tipo="erro" className="mt-4">
          {erro}
        </Alerta>
      )}
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <Botao variante="fantasma" onClick={aoFechar}>
          Manter reserva
        </Botao>
        <Botao variante="perigo" icone={CircleX} carregando={enviando} onClick={confirmar}>
          Cancelar reserva
        </Botao>
      </div>
    </Modal>
  )
}

function AvaliarModal({ reserva, aoFechar, aoAvaliada }) {
  const [nota, setNota] = useState(0)
  const [comentario, setComentario] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState(null)

  async function enviar(evento) {
    evento.preventDefault()
    if (nota < 1) {
      setErro('Escolha uma nota de 1 a 5 estrelas.')
      return
    }
    setEnviando(true)
    setErro(null)
    try {
      await reservas.avaliar(reserva.id, { nota, comentario: comentario.trim() })
      aoAvaliada()
    } catch (falha) {
      setErro(falha.message)
      setEnviando(false)
    }
  }

  return (
    <Modal aberto titulo="Avaliar experiência" aoFechar={aoFechar} largura="max-w-md">
      <form onSubmit={enviar} className="space-y-5">
        <p className="text-sm text-tinta-suave">
          Como foi <strong className="text-petroleo-950">{reserva.oferta.titulo}</strong>? Sua avaliação ajuda outros
          viajantes.
        </p>
        <EntradaEstrelas valor={nota} aoMudar={setNota} />
        <AreaTexto
          rotulo="Comentário"
          placeholder="Conte como foi: atendimento, pontualidade, limpeza…"
          maxLength={1000}
          value={comentario}
          onChange={(evento) => setComentario(evento.target.value)}
        />
        {erro && <Alerta tipo="erro">{erro}</Alerta>}
        <div className="flex flex-wrap justify-end gap-2">
          <Botao variante="fantasma" onClick={aoFechar}>
            Agora não
          </Botao>
          <Botao type="submit" icone={Star} carregando={enviando}>
            Enviar avaliação
          </Botao>
        </div>
      </form>
    </Modal>
  )
}

function CartaoDeReserva({ reserva, aoCancelar, aoAvaliar }) {
  const { oferta } = reserva
  const Icone = iconeDaOferta(oferta)
  const emAndamento = reserva.status === 'SOLICITADA' || reserva.status === 'CONFIRMADA'

  return (
    <article className="cartao p-5 sm:p-6">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-petroleo-50 text-petroleo-800">
          <Icone aria-hidden="true" className="size-6" />
        </span>
        <div className="min-w-0 flex-1 basis-56">
          <SeloStatus status={reserva.status} />
          <h2 className="mt-2 font-display text-lg leading-snug font-bold break-words text-petroleo-950">
            <Link to={`/ofertas/${oferta.id}`} className="hover:underline">
              {oferta.titulo}
            </Link>
          </h2>
          <p className="mt-0.5 text-sm text-tinta-suave">
            {resumoDaOferta(oferta)} · por {oferta.fornecedorNome}
          </p>
        </div>
        <div className="sm:text-right">
          <p className="font-display text-2xl leading-none font-extrabold text-petroleo-950">{moeda(reserva.valorTotal)}</p>
          <p className="mt-1 text-xs text-tinta-suave">a combinar com o fornecedor</p>
        </div>
      </div>

      <dl className="mt-4 grid gap-x-6 gap-y-2 border-t border-petroleo-900/8 pt-4 text-sm text-tinta sm:grid-cols-2">
        <div className="flex items-center gap-2">
          <CalendarDays aria-hidden="true" className="size-4 shrink-0 text-petroleo-600" />
          <dt className="sr-only">Período</dt>
          <dd>
            {fmtDataHora(reserva.dataInicio)}
            {reserva.dataFim ? ` até ${fmtDataHora(reserva.dataFim)}` : ''}
          </dd>
        </div>
        <div className="flex items-center gap-2">
          <Users aria-hidden="true" className="size-4 shrink-0 text-petroleo-600" />
          <dt className="sr-only">Quantidade</dt>
          <dd>
            {plural(reserva.pessoas, 'pessoa', 'pessoas')}
            {reserva.noites ? ` · ${plural(reserva.noites, 'noite', 'noites')} · ${plural(reserva.quantidade, 'quarto', 'quartos')}` : ''}
          </dd>
        </div>
        <div className="flex items-center gap-2 text-tinta-suave">
          <Ticket aria-hidden="true" className="size-4 shrink-0" />
          <dt className="sr-only">Solicitação</dt>
          <dd>Solicitada em {fmtDataHora(reserva.dataSolicitacao)}</dd>
        </div>
        {reserva.status === 'SOLICITADA' && reserva.expiraEm && (
          <div className="flex items-center gap-2 text-amber-900">
            <Hourglass aria-hidden="true" className="size-4 shrink-0" />
            <dt className="sr-only">Prazo de resposta</dt>
            <dd>Fornecedor responde até {fmtDataHora(reserva.expiraEm)}</dd>
          </div>
        )}
      </dl>

      {reserva.status === 'RECUSADA' && (
        <Alerta tipo="info" className="mt-4">
          {reserva.motivo ? (
            <>
              <strong>Motivo informado pelo fornecedor:</strong> {reserva.motivo}
            </>
          ) : (
            'O fornecedor não informou o motivo da recusa.'
          )}
        </Alerta>
      )}
      {reserva.status === 'EXPIRADA' && (
        <Alerta tipo="info" className="mt-4">
          O fornecedor não respondeu em 48 horas e o pedido expirou. Você pode solicitar de novo ou escolher outra oferta.
        </Alerta>
      )}

      {(reserva.podeCancelar || reserva.podeAvaliar || reserva.avaliada || emAndamento) && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {reserva.podeAvaliar && (
            <Botao variante="acento" tamanho="sm" icone={Star} onClick={aoAvaliar}>
              Avaliar
            </Botao>
          )}
          {reserva.avaliada && (
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-800">
              <CircleCheck aria-hidden="true" className="size-4" />
              Você já avaliou
            </span>
          )}
          {reserva.podeCancelar && (
            <Botao variante="perigo-contorno" tamanho="sm" icone={CircleX} onClick={aoCancelar}>
              Cancelar reserva
            </Botao>
          )}
          {emAndamento && !reserva.podeCancelar && !reserva.podeAvaliar && !reserva.avaliada && (
            <p className="text-xs text-tinta-suave">O cancelamento só é possível até 48 horas antes do início.</p>
          )}
        </div>
      )}
    </article>
  )
}

export default function Reservas() {
  const consulta = useDados(() => reservas.listar(), [])
  const { avisar } = useAvisos()
  const [filtro, setFiltro] = useState('TODAS')
  const [cancelando, setCancelando] = useState(null)
  const [avaliando, setAvaliando] = useState(null)

  return (
    <Pagina
      titulo="Minhas reservas"
      descricao="Acompanhe cada solicitação. A reserva só vale depois que o fornecedor confirma; o pagamento é combinado direto com ele."
    >
      <Estado consulta={consulta} textoCarregando="Carregando suas reservas…">
        {(lista) => {
          if (lista.length === 0) {
            return (
              <Vazio
                icone={Ticket}
                titulo="Nenhuma reserva por enquanto"
                acao={
                  <>
                    <LinkBotao to="/itinerarios">Meus itinerários</LinkBotao>
                    <LinkBotao to="/hospedagens" variante="contorno">
                      Buscar hospedagens
                    </LinkBotao>
                  </>
                }
              >
                Solicite uma reserva na página de uma oferta ou envie todas de uma vez a partir de um itinerário.
              </Vazio>
            )
          }
          const contagem = (status) => lista.filter((reserva) => reserva.status === status).length
          const abas = FILTROS.filter((aba) => aba.id === 'TODAS' || contagem(aba.id) > 0).map((aba) => ({
            ...aba,
            rotulo: aba.id === 'TODAS' ? `Todas (${lista.length})` : `${aba.rotulo} (${contagem(aba.id)})`,
          }))
          const visiveis = filtro === 'TODAS' ? lista : lista.filter((reserva) => reserva.status === filtro)

          return (
            <>
              <Abas abas={abas} atual={filtro} aoMudar={setFiltro} rotulo="Filtrar por status" className="mb-5 w-fit" />
              {visiveis.length === 0 ? (
                <Vazio icone={MessageSquareText} titulo="Nenhuma reserva com esse status" />
              ) : (
                <ul className="grid gap-4">
                  {visiveis.map((reserva) => (
                    <li key={reserva.id}>
                      <CartaoDeReserva
                        reserva={reserva}
                        aoCancelar={() => setCancelando(reserva)}
                        aoAvaliar={() => setAvaliando(reserva)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </>
          )
        }}
      </Estado>

      {cancelando && (
        <CancelarModal
          reserva={cancelando}
          aoFechar={() => setCancelando(null)}
          aoCancelada={(atualizada) => {
            consulta.definir((lista) => lista.map((reserva) => (reserva.id === atualizada?.id ? atualizada : reserva)))
            if (!atualizada) consulta.recarregar()
            setCancelando(null)
            avisar('Reserva cancelada.')
          }}
        />
      )}
      {avaliando && (
        <AvaliarModal
          reserva={avaliando}
          aoFechar={() => setAvaliando(null)}
          aoAvaliada={() => {
            consulta.definir((lista) =>
              lista.map((reserva) => (reserva.id === avaliando.id ? { ...reserva, podeAvaliar: false, avaliada: true } : reserva)),
            )
            setAvaliando(null)
            avisar('Avaliação enviada. Obrigado por contar como foi!')
          }}
        />
      )}
    </Pagina>
  )
}
