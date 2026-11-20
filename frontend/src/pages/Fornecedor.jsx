// Painel do fornecedor: gerenciar ofertas (RF-03) e responder solicitações de reserva (RF-11).
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarDays,
  Check,
  ClipboardList,
  Hourglass,
  Inbox,
  PackageOpen,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Search,
  Tags,
  Users,
  X,
} from 'lucide-react'
import { fornecedor } from '../api/index.js'
import OfertaFormModal from '../components/OfertaFormModal.jsx'
import {
  Abas,
  Alerta,
  AreaTexto,
  Botao,
  Carregando,
  ErroAoCarregar,
  Modal,
  Pagina,
  Paginacao,
  Selo,
  SeloStatus,
  Vazio,
} from '../components/ui.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useAvisos } from '../contexts/AvisosContext.jsx'
import { cx, fmtDataHora, moeda, plural } from '../lib/formato.js'
import { useDados } from '../lib/hooks.js'
import { iconeDaOferta, resumoDaOferta, TIPOS_OFERTA } from '../lib/oferta.js'

const POR_PAGINA = 8

/* ------------------------------------------------------------------ Ofertas */

function LinhaDeOferta({ oferta, ocupada, aoEditar, aoAlternar }) {
  const Icone = iconeDaOferta(oferta)
  return (
    <li className={cx('cartao flex flex-wrap items-center gap-x-4 gap-y-3 p-4 sm:p-5', !oferta.ativa && 'bg-white/60')}>
      <span
        className={cx(
          'grid size-12 shrink-0 place-items-center rounded-2xl',
          oferta.ativa ? 'bg-petroleo-50 text-petroleo-800' : 'bg-slate-100 text-slate-500',
        )}
      >
        <Icone aria-hidden="true" className="size-6" />
      </span>
      <div className="min-w-0 flex-1 basis-56">
        <div className="flex flex-wrap items-center gap-2">
          <Selo>{TIPOS_OFERTA[oferta.tipo]?.rotulo}</Selo>
          {oferta.ativa ? (
            <Selo className="bg-emerald-100 text-emerald-900">Ativa</Selo>
          ) : (
            <Selo className="bg-slate-200 text-slate-800">Desativada</Selo>
          )}
          {oferta.ativa && oferta.vagas === 0 && <Selo className="bg-amber-100 text-amber-900">Sem vagas</Selo>}
        </div>
        <h3 className="mt-1.5 font-display text-base leading-snug font-bold break-words text-petroleo-950">
          <Link to={`/ofertas/${oferta.id}`} className="hover:underline">
            {oferta.titulo}
          </Link>
        </h3>
        <p className="text-sm text-tinta-suave">{resumoDaOferta(oferta)}</p>
      </div>
      <dl className="flex gap-6 text-sm">
        <div>
          <dt className="text-xs text-tinta-suave">Preço</dt>
          <dd className="font-display text-lg font-extrabold text-petroleo-950">{moeda(oferta.preco)}</dd>
        </div>
        <div>
          <dt className="text-xs text-tinta-suave">Vagas</dt>
          <dd className="font-display text-lg font-extrabold text-petroleo-950">{oferta.vagas}</dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-2">
        <Botao variante="contorno" tamanho="sm" icone={Pencil} onClick={aoEditar} aria-label={`Editar ${oferta.titulo}`}>
          Editar
        </Botao>
        <Botao
          variante={oferta.ativa ? 'perigo-contorno' : 'primario'}
          tamanho="sm"
          icone={oferta.ativa ? PowerOff : Power}
          carregando={ocupada}
          onClick={aoAlternar}
          aria-label={`${oferta.ativa ? 'Desativar' : 'Ativar'} ${oferta.titulo}`}
        >
          {oferta.ativa ? 'Desativar' : 'Ativar'}
        </Botao>
      </div>
    </li>
  )
}

function AbaOfertas({ consulta, podePublicar, aoMudarOferta }) {
  const { avisar } = useAvisos()
  const [tipo, setTipo] = useState('TODOS')
  const [busca, setBusca] = useState('')
  const [pagina, setPagina] = useState(1)
  const [formulario, setFormulario] = useState(null) // null | { oferta?: OfertaDTO }
  const [alternando, setAlternando] = useState(null)
  const [erro, setErro] = useState(null)

  if (consulta.carregando && consulta.dados == null) return <Carregando texto="Carregando suas ofertas…" />
  if (consulta.erro) return <ErroAoCarregar mensagem={consulta.erro} aoTentar={consulta.recarregar} />

  const todas = consulta.dados ?? []
  const contar = (id) => todas.filter((oferta) => oferta.tipo === id).length
  const termo = busca.trim().toLowerCase()
  const filtradas = todas.filter(
    (oferta) =>
      (tipo === 'TODOS' || oferta.tipo === tipo) &&
      (!termo || `${oferta.titulo} ${oferta.cidade ?? ''} ${oferta.origem ?? ''}`.toLowerCase().includes(termo)),
  )
  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA))
  const paginaAtual = Math.min(pagina, totalPaginas)
  const visiveis = filtradas.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA)

  async function alternarAtiva(oferta) {
    setAlternando(oferta.id)
    setErro(null)
    try {
      const atualizada = await fornecedor.definirAtiva(oferta.id, !oferta.ativa)
      aoMudarOferta(atualizada ?? { ...oferta, ativa: !oferta.ativa })
      avisar(oferta.ativa ? 'Oferta desativada: ela saiu das buscas.' : 'Oferta ativada: ela voltou para as buscas.')
    } catch (falha) {
      setErro(falha.message)
    } finally {
      setAlternando(null)
    }
  }

  return (
    <section aria-label="Minhas ofertas">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-end gap-3">
          <Abas
            rotulo="Filtrar por tipo"
            atual={tipo}
            aoMudar={(novo) => {
              setTipo(novo)
              setPagina(1)
            }}
            abas={[
              { id: 'TODOS', rotulo: `Todas (${todas.length})` },
              { id: 'PASSAGEM', rotulo: `Passagens (${contar('PASSAGEM')})` },
              { id: 'HOSPEDAGEM', rotulo: `Hospedagens (${contar('HOSPEDAGEM')})` },
              { id: 'PASSEIO', rotulo: `Passeios (${contar('PASSEIO')})` },
            ]}
          />
          <label className="relative block">
            <span className="sr-only">Buscar nas minhas ofertas</span>
            <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-tinta-suave" />
            <input
              type="search"
              placeholder="Buscar por título ou cidade"
              value={busca}
              onChange={(evento) => {
                setBusca(evento.target.value)
                setPagina(1)
              }}
              className="campo w-full pl-10 sm:w-64"
            />
          </label>
        </div>
        <Botao icone={Plus} disabled={!podePublicar} onClick={() => setFormulario({})}>
          Nova oferta
        </Botao>
      </div>

      {erro && (
        <Alerta tipo="erro" className="mb-4">
          {erro}
        </Alerta>
      )}

      {todas.length === 0 ? (
        <Vazio
          icone={PackageOpen}
          titulo="Você ainda não cadastrou ofertas"
          acao={
            podePublicar && (
              <Botao icone={Plus} onClick={() => setFormulario({})}>
                Cadastrar a primeira
              </Botao>
            )
          }
        >
          Cadastre passagens, hospedagens ou passeios com preço, datas e vagas. Leva menos de 3 minutos.
        </Vazio>
      ) : visiveis.length === 0 ? (
        <Vazio icone={Tags} titulo="Nenhuma oferta com esse filtro">
          Mude o tipo ou limpe a busca para ver as outras ofertas.
        </Vazio>
      ) : (
        <>
          <p className="mb-3 text-sm text-tinta-suave" role="status">
            Mostrando {visiveis.length} de {plural(filtradas.length, 'oferta', 'ofertas')}
          </p>
          <ul className="grid gap-3">
            {visiveis.map((oferta) => (
              <LinhaDeOferta
                key={oferta.id}
                oferta={oferta}
                ocupada={alternando === oferta.id}
                aoEditar={() => setFormulario({ oferta })}
                aoAlternar={() => alternarAtiva(oferta)}
              />
            ))}
          </ul>
          <Paginacao pagina={paginaAtual} totalPaginas={totalPaginas} aoMudar={setPagina} />
        </>
      )}

      {formulario && (
        <OfertaFormModal
          oferta={formulario.oferta}
          tipoInicial={tipo === 'TODOS' ? undefined : tipo}
          aoFechar={() => setFormulario(null)}
          aoSalvar={(salva) => {
            aoMudarOferta(salva)
            avisar(formulario.oferta ? 'Oferta atualizada.' : 'Oferta publicada.')
            setFormulario(null)
          }}
        />
      )}
    </section>
  )
}

/* -------------------------------------------------------------- Solicitações */

function RecusarModal({ reserva, aoFechar, aoRecusada }) {
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState(null)

  async function recusar(evento) {
    evento.preventDefault()
    setEnviando(true)
    setErro(null)
    try {
      aoRecusada(await fornecedor.recusar(reserva.id, motivo.trim()))
    } catch (falha) {
      setErro(falha.message)
      setEnviando(false)
    }
  }

  return (
    <Modal aberto titulo="Recusar solicitação" aoFechar={aoFechar} largura="max-w-md">
      <form onSubmit={recusar} className="space-y-5">
        <p className="text-sm leading-relaxed text-tinta">
          Você está recusando o pedido de <strong>{reserva.viajanteNome}</strong> para{' '}
          <strong>{reserva.oferta.titulo}</strong>. O viajante é avisado na hora.
        </p>
        <AreaTexto
          rotulo="Motivo (opcional)"
          placeholder="Ex.: sem disponibilidade nessa data."
          maxLength={300}
          rows={3}
          value={motivo}
          onChange={(evento) => setMotivo(evento.target.value)}
        />
        {erro && <Alerta tipo="erro">{erro}</Alerta>}
        <div className="flex flex-wrap justify-end gap-2">
          <Botao variante="fantasma" onClick={aoFechar}>
            Voltar
          </Botao>
          <Botao type="submit" variante="perigo" icone={X} carregando={enviando}>
            Recusar pedido
          </Botao>
        </div>
      </form>
    </Modal>
  )
}

function CartaoDeSolicitacao({ reserva, ocupada, aoAceitar, aoRecusar }) {
  const { oferta } = reserva
  const Icone = iconeDaOferta(oferta)
  const pendente = reserva.status === 'SOLICITADA'
  const faltamVagas = pendente && reserva.quantidade > oferta.vagas

  return (
    <li className={cx('cartao p-5 sm:p-6', pendente && 'border-coral-500/50')}>
      <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-petroleo-50 text-petroleo-800">
          <Icone aria-hidden="true" className="size-6" />
        </span>
        <div className="min-w-0 flex-1 basis-56">
          <SeloStatus status={reserva.status} />
          <h3 className="mt-2 font-display text-lg leading-snug font-bold break-words text-petroleo-950">{oferta.titulo}</h3>
          <p className="text-sm text-tinta-suave">{resumoDaOferta(oferta)}</p>
        </div>
        <div className="sm:text-right">
          <p className="font-display text-2xl leading-none font-extrabold text-petroleo-950">{moeda(reserva.valorTotal)}</p>
          <p className="mt-1 text-xs text-tinta-suave">valor do pedido</p>
        </div>
      </div>

      <dl className="mt-4 grid gap-x-6 gap-y-2 border-t border-petroleo-900/8 pt-4 text-sm text-tinta sm:grid-cols-2">
        <div className="flex items-center gap-2">
          <Users aria-hidden="true" className="size-4 shrink-0 text-petroleo-600" />
          <dt className="sr-only">Viajante</dt>
          <dd>
            <strong className="text-petroleo-950">{reserva.viajanteNome}</strong> · {plural(reserva.pessoas, 'pessoa', 'pessoas')}
            {reserva.noites ? ` · ${plural(reserva.noites, 'noite', 'noites')} · ${plural(reserva.quantidade, 'quarto', 'quartos')}` : ''}
          </dd>
        </div>
        <div className="flex items-center gap-2">
          <CalendarDays aria-hidden="true" className="size-4 shrink-0 text-petroleo-600" />
          <dt className="sr-only">Período</dt>
          <dd>
            {fmtDataHora(reserva.dataInicio)}
            {reserva.dataFim ? ` até ${fmtDataHora(reserva.dataFim)}` : ''}
          </dd>
        </div>
        <div className="flex items-center gap-2 text-tinta-suave">
          <ClipboardList aria-hidden="true" className="size-4 shrink-0" />
          <dt className="sr-only">Pedido</dt>
          <dd>
            Pedido feito em {fmtDataHora(reserva.dataSolicitacao)} · {plural(oferta.vagas, 'vaga livre', 'vagas livres')} na oferta
          </dd>
        </div>
        {pendente && reserva.expiraEm && (
          <div className="flex items-center gap-2 font-medium text-amber-900">
            <Hourglass aria-hidden="true" className="size-4 shrink-0" />
            <dt className="sr-only">Prazo</dt>
            <dd>Responda até {fmtDataHora(reserva.expiraEm)}</dd>
          </div>
        )}
      </dl>

      {reserva.status === 'RECUSADA' && reserva.motivo && (
        <p className="mt-3 text-sm text-tinta-suave">
          <strong className="text-tinta">Motivo informado:</strong> {reserva.motivo}
        </p>
      )}

      {pendente && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Botao variante="primario" tamanho="sm" icone={Check} carregando={ocupada} disabled={faltamVagas} onClick={aoAceitar}>
            Aceitar
          </Botao>
          <Botao variante="perigo-contorno" tamanho="sm" icone={X} disabled={ocupada} onClick={aoRecusar}>
            Recusar
          </Botao>
          {faltamVagas ? (
            <p className="text-xs font-medium text-red-800">
              Vagas insuficientes para aceitar: aumente as vagas da oferta ou recuse o pedido.
            </p>
          ) : (
            <p className="text-xs text-tinta-suave">
              Aceitar desconta {plural(reserva.quantidade, 'vaga', 'vagas')} da oferta e avisa o viajante.
            </p>
          )}
        </div>
      )}
    </li>
  )
}

function AbaSolicitacoes({ consulta, aoMudarReserva }) {
  const { avisar } = useAvisos()
  const [filtro, setFiltro] = useState('SOLICITADA')
  const [pagina, setPagina] = useState(1)
  const [aceitando, setAceitando] = useState(null)
  const [recusando, setRecusando] = useState(null)
  const [erro, setErro] = useState(null)

  if (consulta.carregando && consulta.dados == null) return <Carregando texto="Carregando solicitações…" />
  if (consulta.erro) return <ErroAoCarregar mensagem={consulta.erro} aoTentar={consulta.recarregar} />

  const todas = consulta.dados ?? []
  const pendentes = todas.filter((reserva) => reserva.status === 'SOLICITADA')
  const filtradas = filtro === 'SOLICITADA' ? pendentes : todas
  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA))
  const paginaAtual = Math.min(pagina, totalPaginas)
  const visiveis = filtradas.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA)

  async function aceitar(reserva) {
    setAceitando(reserva.id)
    setErro(null)
    try {
      aoMudarReserva(await fornecedor.aceitar(reserva.id), true)
      avisar(`Reserva de ${reserva.viajanteNome} confirmada. O viajante foi avisado.`)
    } catch (falha) {
      setErro(falha.message)
    } finally {
      setAceitando(null)
    }
  }

  return (
    <section aria-label="Solicitações de reserva">
      <Abas
        rotulo="Filtrar solicitações"
        className="mb-5 w-fit"
        atual={filtro}
        aoMudar={(novo) => {
          setFiltro(novo)
          setPagina(1)
        }}
        abas={[
          { id: 'SOLICITADA', rotulo: `Pendentes (${pendentes.length})` },
          { id: 'TODAS', rotulo: `Histórico completo (${todas.length})` },
        ]}
      />

      {erro && (
        <Alerta tipo="erro" className="mb-4">
          {erro}
        </Alerta>
      )}

      {visiveis.length === 0 ? (
        <Vazio icone={Inbox} titulo={filtro === 'SOLICITADA' ? 'Nenhum pedido aguardando resposta' : 'Nenhuma solicitação ainda'}>
          {filtro === 'SOLICITADA'
            ? 'Quando um viajante solicitar uma reserva, o pedido aparece aqui e você recebe uma notificação.'
            : 'As solicitações recebidas ficam registradas aqui, com o status de cada uma.'}
        </Vazio>
      ) : (
        <>
          <ul className="grid gap-4">
            {visiveis.map((reserva) => (
              <CartaoDeSolicitacao
                key={reserva.id}
                reserva={reserva}
                ocupada={aceitando === reserva.id}
                aoAceitar={() => aceitar(reserva)}
                aoRecusar={() => setRecusando(reserva)}
              />
            ))}
          </ul>
          <Paginacao pagina={paginaAtual} totalPaginas={totalPaginas} aoMudar={setPagina} />
        </>
      )}

      {recusando && (
        <RecusarModal
          reserva={recusando}
          aoFechar={() => setRecusando(null)}
          aoRecusada={(atualizada) => {
            aoMudarReserva(atualizada ?? { ...recusando, status: 'RECUSADA' }, false)
            setRecusando(null)
            avisar('Pedido recusado. O viajante foi avisado.')
          }}
        />
      )}
    </section>
  )
}

/* ------------------------------------------------------------------- Página */

export default function Fornecedor() {
  const { usuario, recarregarUsuario } = useAuth()
  const [aba, setAba] = useState('ofertas')
  const ofertas = useDados(() => fornecedor.ofertas(), [])
  const solicitacoes = useDados(() => fornecedor.reservas(), [])

  // O administrador pode ter aprovado (ou bloqueado) o cadastro desde o último login.
  useEffect(() => {
    recarregarUsuario().catch(() => {})
  }, [recarregarUsuario])

  const podePublicar = Boolean(usuario.aprovado) && !usuario.bloqueado
  const pendentes = (solicitacoes.dados ?? []).filter((reserva) => reserva.status === 'SOLICITADA').length

  function aoMudarOferta(oferta) {
    ofertas.definir((lista) => {
      const atual = lista ?? []
      return atual.some((item) => item.id === oferta.id)
        ? atual.map((item) => (item.id === oferta.id ? oferta : item))
        : [oferta, ...atual]
    })
  }

  function aoMudarReserva(reserva, vagasMudaram) {
    if (reserva) solicitacoes.definir((lista) => (lista ?? []).map((item) => (item.id === reserva.id ? reserva : item)))
    else solicitacoes.recarregar()
    // O aceite desconta vagas: atualiza a lista de ofertas para refletir.
    if (vagasMudaram) ofertas.recarregar()
  }

  return (
    <Pagina
      titulo="Painel do fornecedor"
      sobretitulo={usuario.razaoSocial || usuario.nome}
      descricao="Cadastre e atualize suas ofertas, controle as vagas e responda às solicitações de reserva dos viajantes."
    >
      {usuario.bloqueado ? (
        <Alerta tipo="erro" titulo="Cadastro bloqueado" className="mb-6">
          O administrador bloqueou este cadastro. Suas ofertas não aparecem nas buscas e não é possível publicar novas.
        </Alerta>
      ) : (
        !usuario.aprovado && (
          <Alerta tipo="aviso" titulo="Aguardando aprovação" className="mb-6">
            Seu cadastro de fornecedor ainda não foi aprovado pelo administrador. Assim que for, você poderá publicar
            ofertas e elas aparecerão nas buscas. Você recebe uma notificação quando isso acontecer.
          </Alerta>
        )
      )}

      <Abas
        rotulo="Seções do painel"
        className="mb-6 w-fit"
        atual={aba}
        aoMudar={setAba}
        abas={[
          { id: 'ofertas', rotulo: 'Ofertas', icone: Tags },
          { id: 'solicitacoes', rotulo: 'Solicitações', icone: ClipboardList, contador: pendentes },
        ]}
      />

      {aba === 'ofertas' ? (
        <AbaOfertas consulta={ofertas} podePublicar={podePublicar} aoMudarOferta={aoMudarOferta} />
      ) : (
        <AbaSolicitacoes consulta={solicitacoes} aoMudarReserva={aoMudarReserva} />
      )}
    </Pagina>
  )
}
