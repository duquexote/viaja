// Painel administrativo (RF-15): indicadores de uso, aprovação de fornecedores e moderação de avaliações.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Backpack,
  Ban,
  Check,
  Hourglass,
  Map as IconeMapa,
  MessageSquareText,
  ShieldCheck,
  Star,
  Store,
  Tags,
  Ticket,
  Trash2,
  Users,
} from 'lucide-react'
import { admin } from '../api/index.js'
import {
  Abas,
  Alerta,
  Botao,
  Carregando,
  ErroAoCarregar,
  Estrelas,
  Modal,
  Pagina,
  Selo,
  Vazio,
} from '../components/ui.jsx'
import { useAvisos } from '../contexts/AvisosContext.jsx'
import { cx, fmtData } from '../lib/formato.js'
import { useDados } from '../lib/hooks.js'
import { STATUS_RESERVA } from '../lib/oferta.js'

/* --------------------------------------------------------------- Indicadores */

function Indicador({ icone: Icone, rotulo, valor, destaque }) {
  return (
    <div className={cx('cartao p-5', destaque && 'border-coral-500/60 bg-coral-50')}>
      <div className="flex items-center justify-between gap-3">
        <dt className="text-sm font-semibold text-tinta-suave">{rotulo}</dt>
        <span
          className={cx(
            'grid size-9 shrink-0 place-items-center rounded-xl',
            destaque ? 'bg-coral-500 text-petroleo-950' : 'bg-petroleo-50 text-petroleo-800',
          )}
        >
          <Icone aria-hidden="true" className="size-5" />
        </span>
      </div>
      <dd className="mt-2 font-display text-4xl leading-none font-extrabold text-petroleo-950">{valor ?? 0}</dd>
    </div>
  )
}

const CORES_DO_STATUS = {
  SOLICITADA: 'bg-amber-500',
  CONFIRMADA: 'bg-emerald-600',
  RECUSADA: 'bg-red-600',
  EXPIRADA: 'bg-slate-500',
  CANCELADA: 'bg-slate-400',
}

function Indicadores({ consulta }) {
  if (consulta.carregando && consulta.dados == null) return <Carregando texto="Calculando indicadores…" className="py-10" />
  if (consulta.erro) return <ErroAoCarregar mensagem={consulta.erro} aoTentar={consulta.recarregar} />
  const dados = consulta.dados ?? {}
  const porStatus = dados.reservasPorStatus ?? {}
  const maior = Math.max(1, ...Object.values(porStatus).map(Number))

  return (
    <section aria-labelledby="titulo-indicadores">
      <h2 id="titulo-indicadores" className="sr-only">
        Indicadores de uso
      </h2>
      <dl className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Indicador icone={Users} rotulo="Usuários" valor={dados.totalUsuarios} />
        <Indicador icone={Backpack} rotulo="Viajantes" valor={dados.totalViajantes} />
        <Indicador icone={Store} rotulo="Fornecedores" valor={dados.totalFornecedores} />
        <Indicador
          icone={Hourglass}
          rotulo="Aguardando aprovação"
          valor={dados.fornecedoresPendentes}
          destaque={dados.fornecedoresPendentes > 0}
        />
        <Indicador icone={Tags} rotulo="Ofertas ativas" valor={dados.ofertasAtivas} />
        <Indicador icone={IconeMapa} rotulo="Itinerários" valor={dados.totalItinerarios} />
        <Indicador icone={Ticket} rotulo="Reservas" valor={dados.totalReservas} />
        <Indicador icone={Star} rotulo="Avaliações" valor={dados.totalAvaliacoes} />
      </dl>

      <div className="cartao mt-4 p-5 sm:p-6">
        <h3 className="font-display text-lg font-bold text-petroleo-950">Reservas por status</h3>
        <dl className="mt-4 space-y-3">
          {Object.keys(STATUS_RESERVA).map((status) => {
            const quantidade = Number(porStatus[status] ?? 0)
            return (
              <div key={status} className="grid grid-cols-[9rem_1fr_2.5rem] items-center gap-3 text-sm sm:grid-cols-[11rem_1fr_3rem]">
                <dt className="font-medium text-tinta">{STATUS_RESERVA[status].rotulo}</dt>
                <dd className="contents">
                  <span aria-hidden="true" className="h-3 overflow-hidden rounded-full bg-petroleo-900/10">
                    <span
                      className={cx('block h-full rounded-full', CORES_DO_STATUS[status])}
                      style={{ width: `${(quantidade / maior) * 100}%` }}
                    />
                  </span>
                  <span className="text-right font-display font-bold text-petroleo-950">{quantidade}</span>
                </dd>
              </div>
            )
          })}
        </dl>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------- Fornecedores */

function situacao(fornecedor) {
  if (fornecedor.bloqueado) return { rotulo: 'Bloqueado', classe: 'bg-red-100 text-red-900', ordem: 2 }
  if (fornecedor.aprovado) return { rotulo: 'Aprovado', classe: 'bg-emerald-100 text-emerald-900', ordem: 1 }
  return { rotulo: 'Aguardando aprovação', classe: 'bg-amber-100 text-amber-900', ordem: 0 }
}

function AbaFornecedores({ consulta, aoMudar }) {
  const { avisar } = useAvisos()
  const [ocupado, setOcupado] = useState(null)
  const [erro, setErro] = useState(null)

  if (consulta.carregando && consulta.dados == null) return <Carregando texto="Carregando fornecedores…" />
  if (consulta.erro) return <ErroAoCarregar mensagem={consulta.erro} aoTentar={consulta.recarregar} />

  // Quem aguarda aprovação aparece primeiro.
  const lista = [...(consulta.dados ?? [])].sort((a, b) => situacao(a).ordem - situacao(b).ordem)

  async function executar(fornecedor, acao, mensagem) {
    setOcupado(`${acao}-${fornecedor.id}`)
    setErro(null)
    try {
      const atualizado = acao === 'aprovar' ? await admin.aprovar(fornecedor.id) : await admin.bloquear(fornecedor.id)
      aoMudar(atualizado)
      avisar(mensagem)
    } catch (falha) {
      setErro(falha.message)
    } finally {
      setOcupado(null)
    }
  }

  if (lista.length === 0) {
    return (
      <Vazio icone={Store} titulo="Nenhum fornecedor cadastrado">
        Quando um fornecedor criar conta, ele aparece aqui para aprovação.
      </Vazio>
    )
  }

  return (
    <section aria-label="Fornecedores">
      {erro && (
        <Alerta tipo="erro" className="mb-4">
          {erro}
        </Alerta>
      )}
      <ul className="grid gap-3">
        {lista.map((fornecedor) => {
          const estado = situacao(fornecedor)
          const nome = fornecedor.razaoSocial || fornecedor.nome
          return (
            <li key={fornecedor.id} className="cartao flex flex-wrap items-center gap-x-5 gap-y-3 p-5">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-petroleo-50 text-petroleo-800">
                <Store aria-hidden="true" className="size-6" />
              </span>
              <div className="min-w-0 flex-1 basis-56">
                <Selo className={estado.classe}>{estado.rotulo}</Selo>
                <h3 className="mt-1.5 font-display text-lg leading-snug font-bold break-words text-petroleo-950">{nome}</h3>
                <p className="text-sm break-words text-tinta-suave">
                  Responsável: {fornecedor.nome} · {fornecedor.email}
                </p>
                <p className="text-sm text-tinta-suave">CNPJ: {fornecedor.cnpj || 'não informado'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(!fornecedor.aprovado || fornecedor.bloqueado) && (
                  <Botao
                    tamanho="sm"
                    icone={Check}
                    carregando={ocupado === `aprovar-${fornecedor.id}`}
                    onClick={() => executar(fornecedor, 'aprovar', `${nome} foi aprovado e já pode publicar ofertas.`)}
                    aria-label={`${fornecedor.bloqueado ? 'Desbloquear e aprovar' : 'Aprovar'} ${nome}`}
                  >
                    {fornecedor.bloqueado ? 'Desbloquear' : 'Aprovar'}
                  </Botao>
                )}
                {!fornecedor.bloqueado && (
                  <Botao
                    variante="perigo-contorno"
                    tamanho="sm"
                    icone={Ban}
                    carregando={ocupado === `bloquear-${fornecedor.id}`}
                    onClick={() => executar(fornecedor, 'bloquear', `${nome} foi bloqueado. As ofertas saíram das buscas.`)}
                    aria-label={`Bloquear ${nome}`}
                  >
                    Bloquear
                  </Botao>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/* ---------------------------------------------------------------- Avaliações */

function AbaAvaliacoes({ consulta, aoRemover }) {
  const { avisar } = useAvisos()
  const [removendo, setRemovendo] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState(null)

  if (consulta.carregando && consulta.dados == null) return <Carregando texto="Carregando avaliações…" />
  if (consulta.erro) return <ErroAoCarregar mensagem={consulta.erro} aoTentar={consulta.recarregar} />

  const lista = consulta.dados ?? []

  async function remover() {
    setEnviando(true)
    setErro(null)
    try {
      await admin.removerAvaliacao(removendo.id)
      aoRemover(removendo.id)
      avisar('Avaliação removida. A nota média da oferta foi recalculada.')
      setRemovendo(null)
    } catch (falha) {
      setErro(falha.message)
    } finally {
      setEnviando(false)
    }
  }

  if (lista.length === 0) {
    return (
      <Vazio icone={MessageSquareText} titulo="Nenhuma avaliação publicada">
        As avaliações dos viajantes aparecem aqui para moderação.
      </Vazio>
    )
  }

  return (
    <section aria-label="Avaliações">
      <ul className="grid gap-3">
        {lista.map((avaliacao) => (
          <li key={avaliacao.id} className="cartao flex flex-wrap items-start gap-x-5 gap-y-3 p-5">
            <div className="min-w-0 flex-1 basis-64">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Estrelas nota={avaliacao.nota} />
                <span className="text-sm font-semibold text-petroleo-950">{avaliacao.viajanteNome}</span>
                <span className="text-xs text-tinta-suave">{fmtData(avaliacao.data)}</span>
              </div>
              <p className="mt-1 text-sm text-tinta-suave">
                Sobre{' '}
                <Link to={`/ofertas/${avaliacao.ofertaId}`} className="elo">
                  {avaliacao.ofertaTitulo}
                </Link>
              </p>
              <p className="mt-2 text-sm leading-relaxed break-words text-tinta">
                {avaliacao.comentario || <em className="text-tinta-suave">Sem comentário.</em>}
              </p>
            </div>
            <Botao
              variante="perigo-contorno"
              tamanho="sm"
              icone={Trash2}
              onClick={() => {
                setErro(null)
                setRemovendo(avaliacao)
              }}
              aria-label={`Remover avaliação de ${avaliacao.viajanteNome} sobre ${avaliacao.ofertaTitulo}`}
            >
              Remover
            </Botao>
          </li>
        ))}
      </ul>

      {removendo && (
        <Modal aberto titulo="Remover esta avaliação?" aoFechar={() => setRemovendo(null)} largura="max-w-md">
          <p className="text-sm leading-relaxed text-tinta">
            A avaliação de <strong>{removendo.viajanteNome}</strong> sobre <strong>{removendo.ofertaTitulo}</strong> será
            apagada e deixará de contar na nota média. Use para conteúdo abusivo ou indevido.
          </p>
          {erro && (
            <Alerta tipo="erro" className="mt-4">
              {erro}
            </Alerta>
          )}
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <Botao variante="fantasma" onClick={() => setRemovendo(null)}>
              Manter
            </Botao>
            <Botao variante="perigo" icone={Trash2} carregando={enviando} onClick={remover}>
              Remover avaliação
            </Botao>
          </div>
        </Modal>
      )}
    </section>
  )
}

/* ------------------------------------------------------------------- Página */

export default function Admin() {
  const indicadores = useDados(() => admin.indicadores(), [])
  const fornecedores = useDados(() => admin.fornecedores(), [])
  const avaliacoes = useDados(() => admin.avaliacoes(), [])
  const [aba, setAba] = useState('fornecedores')
  const pendentes = (fornecedores.dados ?? []).filter((fornecedor) => !fornecedor.aprovado && !fornecedor.bloqueado).length

  return (
    <Pagina
      titulo="Painel administrativo"
      sobretitulo={
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck aria-hidden="true" className="size-4" />
          Administração da plataforma
        </span>
      }
      descricao="Acompanhe o uso do ViaJá, aprove ou bloqueie fornecedores e modere as avaliações."
    >
      <Indicadores consulta={indicadores} />

      <Abas
        rotulo="Seções do painel"
        className="mt-8 mb-6 w-fit"
        atual={aba}
        aoMudar={setAba}
        abas={[
          { id: 'fornecedores', rotulo: 'Fornecedores', icone: Store, contador: pendentes },
          { id: 'avaliacoes', rotulo: 'Avaliações', icone: Star },
        ]}
      />

      {aba === 'fornecedores' ? (
        <AbaFornecedores
          consulta={fornecedores}
          aoMudar={(atualizado) => {
            if (atualizado) {
              fornecedores.definir((lista) => (lista ?? []).map((item) => (item.id === atualizado.id ? atualizado : item)))
            } else {
              fornecedores.recarregar()
            }
            indicadores.recarregar()
          }}
        />
      ) : (
        <AbaAvaliacoes
          consulta={avaliacoes}
          aoRemover={(id) => {
            avaliacoes.definir((lista) => (lista ?? []).filter((item) => item.id !== id))
            indicadores.recarregar()
          }}
        />
      )}
    </Pagina>
  )
}
