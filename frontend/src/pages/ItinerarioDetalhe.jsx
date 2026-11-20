// Itinerário por dia, com alerta de conflito de datas, custo total e envio das solicitações (RF-08, RF-10).
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  BedDouble,
  Bus,
  CalendarDays,
  Moon,
  Mountain,
  Pencil,
  Plus,
  Send,
  Sparkles,
  Trash2,
  TriangleAlert,
  Users,
} from 'lucide-react'
import { itinerarios } from '../api/index.js'
import ItinerarioFormModal from '../components/ItinerarioFormModal.jsx'
import { Alerta, Botao, Carregando, ErroAoCarregar, LinkBotao, Modal, Selo, SeloStatus } from '../components/ui.jsx'
import { useAvisos } from '../contexts/AvisosContext.jsx'
import { cx, fmtData, fmtDataCurta, fmtDataExtenso, moeda, plural, somarDias } from '../lib/formato.js'
import { useDados, useTitulo } from '../lib/hooks.js'
import { iconeDaOferta, resumoDaOferta } from '../lib/oferta.js'

const RESERVA_ATIVA = ['SOLICITADA', 'CONFIRMADA']

function ItemDoRoteiro({ item, itinerario, ocupado, aoAlterar, aoRemover }) {
  const { oferta } = item
  const Icone = iconeDaOferta(oferta)
  const hospedagem = oferta.tipo === 'HOSPEDAGEM'
  const reservaAtiva = RESERVA_ATIVA.includes(item.reservaStatus)
  const [noites, setNoites] = useState(String(item.noites ?? 1))

  useEffect(() => {
    setNoites(String(item.noites ?? 1))
  }, [item.noites])

  const dias = Array.from({ length: itinerario.totalDias }, (_, indice) => indice + 1)
  const foraDoPeriodo = !dias.includes(item.dia)

  function confirmarNoites() {
    const valor = Math.max(1, Number(noites) || 1)
    if (valor !== (item.noites ?? 1)) aoAlterar({ dia: item.dia, horario: item.horario, noites: valor })
    else setNoites(String(valor))
  }

  return (
    <li className="rounded-2xl border border-petroleo-900/10 bg-white p-4">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-petroleo-50 text-petroleo-800">
          <Icone aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0 flex-1 basis-48">
          <p className="text-xs font-bold tracking-wide text-coral-700 uppercase">
            {hospedagem ? `Check-in às ${item.horario ?? '14:00'}` : item.horario}
          </p>
          <h3 className="font-display text-base leading-snug font-bold break-words text-petroleo-950">
            <Link to={`/ofertas/${oferta.id}`} className="hover:underline">
              {oferta.titulo}
            </Link>
          </h3>
          <p className="mt-0.5 text-sm text-tinta-suave">{resumoDaOferta(oferta)}</p>
          {hospedagem && item.noites != null && (
            <p className="mt-0.5 text-sm text-tinta-suave">
              {plural(item.noites, 'noite', 'noites')} · check-out em {fmtDataCurta(somarDias(item.data, item.noites))}
            </p>
          )}
          {item.reservaStatus && (
            <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-tinta-suave">
              Reserva: <SeloStatus status={item.reservaStatus} />
            </p>
          )}
        </div>
        <p className="font-display text-lg font-extrabold whitespace-nowrap text-petroleo-950">{moeda(item.custo)}</p>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-petroleo-900/8 pt-3">
        <label className="text-xs font-semibold text-petroleo-900">
          Dia
          <select
            value={item.dia}
            disabled={ocupado || reservaAtiva}
            onChange={(evento) => aoAlterar({ dia: Number(evento.target.value), horario: item.horario, noites: item.noites })}
            className="campo mt-1 min-h-10 w-auto py-1.5 pr-8 text-sm"
          >
            {foraDoPeriodo && <option value={item.dia}>Dia {item.dia} (fora do período)</option>}
            {dias.map((dia) => (
              <option key={dia} value={dia}>
                Dia {dia} · {fmtDataCurta(somarDias(itinerario.dataInicio, dia - 1))}
              </option>
            ))}
          </select>
        </label>
        {hospedagem && (
          <label className="text-xs font-semibold text-petroleo-900">
            Noites
            <input
              type="number"
              min={1}
              max={60}
              value={noites}
              disabled={ocupado || reservaAtiva}
              onChange={(evento) => setNoites(evento.target.value)}
              onBlur={confirmarNoites}
              onKeyDown={(evento) => {
                if (evento.key === 'Enter') evento.currentTarget.blur()
              }}
              className="campo mt-1 min-h-10 w-20 py-1.5 text-sm"
            />
          </label>
        )}
        <Botao
          variante="perigo-contorno"
          tamanho="sm"
          icone={Trash2}
          disabled={ocupado}
          onClick={aoRemover}
          className="ml-auto"
          aria-label={`Remover ${oferta.titulo} do itinerário`}
        >
          Remover
        </Botao>
      </div>
      {reservaAtiva && (
        <p className="mt-2 text-xs text-tinta-suave">
          Este item já tem reserva em andamento. Para mudar a data, cancele a reserva em Minhas reservas.
        </p>
      )}
    </li>
  )
}

function ConfirmarExclusao({ nome, aoFechar, aoConfirmar, enviando }) {
  return (
    <Modal aberto titulo="Excluir itinerário?" aoFechar={aoFechar} largura="max-w-md">
      <p className="text-sm leading-relaxed text-tinta">
        O itinerário <strong>{nome}</strong> e todos os seus itens serão apagados. As reservas já solicitadas
        continuam em Minhas reservas.
      </p>
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <Botao variante="fantasma" onClick={aoFechar}>
          Manter
        </Botao>
        <Botao variante="perigo" icone={Trash2} carregando={enviando} onClick={aoConfirmar}>
          Excluir
        </Botao>
      </div>
    </Modal>
  )
}

function linkDeBusca(rota, parametros) {
  const consulta = new URLSearchParams()
  for (const [chave, valor] of Object.entries(parametros)) if (valor) consulta.set(chave, valor)
  return `${rota}?${consulta}`
}

export default function ItinerarioDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { avisar } = useAvisos()
  const consulta = useDados(() => itinerarios.obter(id), [id])
  const itinerario = consulta.dados
  const [ocupado, setOcupado] = useState(false)
  const [falha, setFalha] = useState(null)
  const [editando, setEditando] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [solicitando, setSolicitando] = useState(false)
  useTitulo(itinerario?.nome ?? 'Itinerário')

  if (consulta.carregando && !itinerario) return <Carregando texto="Carregando o itinerário…" className="py-28" />
  if (consulta.erro || !itinerario) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <ErroAoCarregar mensagem={consulta.erro ?? 'Itinerário não encontrado.'} aoTentar={consulta.recarregar} />
      </div>
    )
  }

  /** Executa uma alteração; a API devolve o itinerário atualizado (com conflitos e custo recalculados). */
  async function executar(acao, mensagem) {
    setOcupado(true)
    setFalha(null)
    try {
      const atualizado = await acao()
      if (atualizado) consulta.definir(atualizado)
      if (mensagem) avisar(mensagem)
      return true
    } catch (erro) {
      setFalha(erro.message)
      return false
    } finally {
      setOcupado(false)
    }
  }

  async function excluir() {
    setOcupado(true)
    try {
      await itinerarios.excluir(itinerario.id)
      avisar('Itinerário excluído.')
      navigate('/itinerarios', { replace: true })
    } catch (erro) {
      setFalha(erro.message)
      setExcluindo(false)
      setOcupado(false)
    }
  }

  const itens = itinerario.itens ?? []
  const conflitos = itinerario.conflitos ?? []
  const dias = Array.from({ length: itinerario.totalDias }, (_, indice) => indice + 1)
  const foraDoPeriodo = itens.filter((item) => !dias.includes(item.dia))
  const estadias = itens.filter((item) => item.oferta.tipo === 'HOSPEDAGEM' && item.noites)
  const semReserva = itens.filter((item) => !RESERVA_ATIVA.includes(item.reservaStatus)).length

  const passagem = itens.find((item) => item.oferta.tipo === 'PASSAGEM')?.oferta
  const destino = passagem?.destino ?? itens.find((item) => item.oferta.tipo !== 'PASSAGEM')?.oferta.cidade ?? ''
  const pessoas = String(itinerario.pessoas)

  let motivoDoBloqueio = null
  if (itens.length === 0) motivoDoBloqueio = 'Adicione pelo menos um item para solicitar reservas.'
  else if (conflitos.length > 0) motivoDoBloqueio = 'Corrija os conflitos de datas e vagas para liberar as solicitações.'
  else if (!itinerario.podeSolicitar) motivoDoBloqueio = 'Todos os itens já têm reserva em andamento.'

  const ordenar = (lista) => [...lista].sort((a, b) => (a.horario ?? '').localeCompare(b.horario ?? ''))

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <Link to="/itinerarios" className="inline-flex items-center gap-1.5 text-sm font-semibold text-petroleo-700 hover:underline">
        <ArrowLeft aria-hidden="true" className="size-4" />
        Meus itinerários
      </Link>

      <header className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {itinerario.geradoPorIA && (
            <Selo icone={Sparkles} className="mb-2 bg-coral-100 text-coral-800">
              Sugerido pelo assistente
            </Selo>
          )}
          <h1 className="font-display text-3xl font-extrabold tracking-tight break-words text-petroleo-950 sm:text-4xl">
            {itinerario.nome}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-tinta-suave">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays aria-hidden="true" className="size-4" />
              {fmtData(itinerario.dataInicio)} a {fmtData(itinerario.dataFim)} ({plural(itinerario.totalDias, 'dia', 'dias')})
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users aria-hidden="true" className="size-4" />
              {plural(itinerario.pessoas, 'pessoa', 'pessoas')}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Botao variante="contorno" icone={Pencil} onClick={() => setEditando(true)}>
            Editar
          </Botao>
          <Botao variante="perigo-contorno" icone={Trash2} onClick={() => setExcluindo(true)}>
            Excluir
          </Botao>
        </div>
      </header>

      <div className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start">
        <div className="min-w-0 space-y-6">
          {conflitos.length > 0 && (
            <div role="alert" className="rounded-3xl border-2 border-red-700/40 bg-red-50 p-5 text-red-950">
              <p className="flex items-center gap-2 font-display text-lg font-bold">
                <TriangleAlert aria-hidden="true" className="size-6 shrink-0 text-red-700" />
                {plural(conflitos.length, 'conflito encontrado', 'conflitos encontrados')} no itinerário
              </p>
              <ul className="mt-3 list-disc space-y-1.5 pl-6 text-sm leading-relaxed">
                {conflitos.map((conflito, indice) => (
                  <li key={`${indice}-${conflito}`}>{conflito}</li>
                ))}
              </ul>
              <p className="mt-3 text-sm font-semibold">
                Ajuste o dia ou as noites dos itens abaixo. As solicitações de reserva ficam bloqueadas até corrigir.
              </p>
            </div>
          )}

          {falha && <Alerta tipo="erro">{falha}</Alerta>}

          {foraDoPeriodo.length > 0 && (
            <section aria-labelledby="titulo-fora" className="rounded-3xl border border-dashed border-red-700/40 bg-white/60 p-5">
              <h2 id="titulo-fora" className="font-display text-lg font-bold text-red-900">
                Fora do período do itinerário
              </h2>
              <ul className="mt-3 space-y-3">
                {ordenar(foraDoPeriodo).map((item) => (
                  <ItemDoRoteiro
                    key={item.id}
                    item={item}
                    itinerario={itinerario}
                    ocupado={ocupado}
                    aoAlterar={(dados) => executar(() => itinerarios.atualizarItem(itinerario.id, item.id, dados))}
                    aoRemover={() => executar(() => itinerarios.removerItem(itinerario.id, item.id), 'Item removido.')}
                  />
                ))}
              </ul>
            </section>
          )}

          <ol className="space-y-5">
            {dias.map((dia) => {
              const data = somarDias(itinerario.dataInicio, dia - 1)
              const doDia = ordenar(itens.filter((item) => item.dia === dia))
              const pernoites = estadias.filter((item) => dia > item.dia && dia < item.dia + item.noites)
              const saidas = estadias.filter((item) => dia === item.dia + item.noites)
              return (
                <li key={dia} className="relative rounded-3xl bg-areia-100 p-4 sm:p-5">
                  <h2 className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="rounded-full bg-petroleo-800 px-3 py-1 font-display text-sm font-bold text-white">
                      Dia {dia}
                    </span>
                    <span className="font-display text-lg font-bold text-petroleo-950 first-letter:uppercase">
                      {fmtDataExtenso(data)}
                    </span>
                  </h2>

                  {(pernoites.length > 0 || saidas.length > 0) && (
                    <ul className="mt-3 space-y-1 text-sm text-tinta-suave">
                      {saidas.map((item) => (
                        <li key={`saida-${item.id}`} className="flex items-center gap-2">
                          <BedDouble aria-hidden="true" className="size-4 shrink-0" />
                          Check-out de {item.oferta.titulo}
                        </li>
                      ))}
                      {pernoites.map((item) => (
                        <li key={`noite-${item.id}`} className="flex items-center gap-2">
                          <Moon aria-hidden="true" className="size-4 shrink-0" />
                          Hospedado em {item.oferta.titulo}
                        </li>
                      ))}
                    </ul>
                  )}

                  {doDia.length === 0 ? (
                    <p className="mt-3 rounded-2xl border border-dashed border-petroleo-900/20 px-4 py-3 text-sm text-tinta-suave">
                      Dia livre: nenhum item marcado.
                    </p>
                  ) : (
                    <ul className="mt-3 space-y-3">
                      {doDia.map((item) => (
                        <ItemDoRoteiro
                          key={item.id}
                          item={item}
                          itinerario={itinerario}
                          ocupado={ocupado}
                          aoAlterar={(dados) => executar(() => itinerarios.atualizarItem(itinerario.id, item.id, dados))}
                          aoRemover={() => executar(() => itinerarios.removerItem(itinerario.id, item.id), 'Item removido.')}
                        />
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
          </ol>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24" aria-label="Resumo do itinerário">
          <div className="cartao p-5 sm:p-6">
            <p className="text-sm font-semibold text-tinta-suave">Custo total estimado</p>
            <p className="font-display text-4xl leading-tight font-extrabold text-petroleo-950">{moeda(itinerario.custoTotal)}</p>
            <p className="mt-1 text-sm text-tinta-suave">
              {plural(itens.length, 'item', 'itens')} para {plural(itinerario.pessoas, 'pessoa', 'pessoas')}
            </p>

            <Botao
              variante="acento"
              tamanho="lg"
              icone={Send}
              className="mt-5 w-full"
              disabled={!itinerario.podeSolicitar || ocupado}
              carregando={solicitando}
              aria-describedby={motivoDoBloqueio ? 'motivo-bloqueio' : undefined}
              onClick={async () => {
                setSolicitando(true)
                await executar(
                  () => itinerarios.solicitar(itinerario.id),
                  'Solicitações enviadas. Acompanhe as respostas em Minhas reservas.',
                )
                setSolicitando(false)
              }}
            >
              Solicitar reservas{itinerario.podeSolicitar && semReserva > 0 ? ` (${semReserva})` : ''}
            </Botao>
            {motivoDoBloqueio ? (
              <p id="motivo-bloqueio" className={cx('mt-3 text-sm font-medium', conflitos.length > 0 ? 'text-red-800' : 'text-tinta-suave')}>
                {motivoDoBloqueio}
              </p>
            ) : (
              <p className="mt-3 text-xs leading-relaxed text-tinta-suave">
                Envia um pedido para cada item sem reserva. Nada é cobrado: o fornecedor confirma em até 48 horas.
              </p>
            )}
            <Link to="/reservas" className="elo mt-4 inline-block text-sm">
              Ver minhas reservas
            </Link>
          </div>

          <div className="cartao p-5 sm:p-6">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-petroleo-950">
              <Plus aria-hidden="true" className="size-5 text-coral-600" />
              Adicionar ao roteiro
            </h2>
            <p className="mt-1 text-sm text-tinta-suave">
              Busque e use o botão “Adicionar ao itinerário” no cartão da oferta.
            </p>
            <div className="mt-4 grid gap-2">
              <LinkBotao
                variante="contorno"
                icone={Bus}
                to={linkDeBusca('/passagens', { destino, data: itinerario.dataInicio, passageiros: pessoas })}
              >
                Buscar passagens
              </LinkBotao>
              <LinkBotao
                variante="contorno"
                icone={BedDouble}
                to={linkDeBusca('/hospedagens', {
                  cidade: destino,
                  checkin: itinerario.dataInicio,
                  checkout: itinerario.totalDias > 1 ? itinerario.dataFim : '',
                  hospedes: pessoas,
                })}
              >
                Buscar hospedagens
              </LinkBotao>
              <LinkBotao
                variante="contorno"
                icone={Mountain}
                to={linkDeBusca('/passeios', { cidade: destino, data: itinerario.dataInicio, dataFim: itinerario.dataFim })}
              >
                Buscar passeios
              </LinkBotao>
            </div>
          </div>
        </aside>
      </div>

      {editando && (
        <ItinerarioFormModal
          itinerario={itinerario}
          aoFechar={() => setEditando(false)}
          aoSalvar={(salvo) => {
            consulta.definir(salvo)
            setEditando(false)
            avisar('Itinerário atualizado.')
          }}
        />
      )}
      {excluindo && (
        <ConfirmarExclusao
          nome={itinerario.nome}
          enviando={ocupado}
          aoFechar={() => setExcluindo(false)}
          aoConfirmar={excluir}
        />
      )}
    </div>
  )
}
