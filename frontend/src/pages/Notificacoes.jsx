// Notificações dentro do sistema (RF-14).
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, BellRing, CalendarClock, CheckCheck, CircleCheck, CircleX, Hourglass, Inbox, ShieldCheck, ShieldX } from 'lucide-react'
import { notificacoes } from '../api/index.js'
import { Alerta, Botao, Estado, Pagina, Vazio } from '../components/ui.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useNotificacoes } from '../contexts/NotificacoesContext.jsx'
import { cx, fmtQuando } from '../lib/formato.js'
import { useDados } from '../lib/hooks.js'

const TIPOS = {
  NOVA_SOLICITACAO: { icone: BellRing, classe: 'bg-coral-100 text-coral-800', titulo: 'Nova solicitação' },
  RESERVA_CONFIRMADA: { icone: CircleCheck, classe: 'bg-emerald-100 text-emerald-900', titulo: 'Reserva confirmada' },
  RESERVA_RECUSADA: { icone: CircleX, classe: 'bg-red-100 text-red-900', titulo: 'Reserva recusada' },
  RESERVA_CANCELADA: { icone: CircleX, classe: 'bg-slate-200 text-slate-800', titulo: 'Reserva cancelada' },
  RESERVA_EXPIRADA: { icone: Hourglass, classe: 'bg-slate-200 text-slate-800', titulo: 'Solicitação expirada' },
  LEMBRETE_VIAGEM: { icone: CalendarClock, classe: 'bg-sol-200 text-amber-950', titulo: 'Lembrete de viagem' },
  FORNECEDOR_APROVADO: { icone: ShieldCheck, classe: 'bg-emerald-100 text-emerald-900', titulo: 'Cadastro aprovado' },
  FORNECEDOR_BLOQUEADO: { icone: ShieldX, classe: 'bg-red-100 text-red-900', titulo: 'Cadastro bloqueado' },
}
const PADRAO = { icone: Bell, classe: 'bg-petroleo-100 text-petroleo-900', titulo: 'Aviso' }

function destinoDoPerfil(perfil) {
  if (perfil === 'FORNECEDOR') return { para: '/fornecedor', rotulo: 'Abrir painel do fornecedor' }
  if (perfil === 'VIAJANTE') return { para: '/reservas', rotulo: 'Ver minhas reservas' }
  return null
}

export default function Notificacoes() {
  const { usuario } = useAuth()
  const { atualizar } = useNotificacoes()
  const consulta = useDados(() => notificacoes.listar(), [])
  const [erro, setErro] = useState(null)
  const [marcando, setMarcando] = useState(false)
  const atalho = destinoDoPerfil(usuario?.perfil)
  const naoLidas = (consulta.dados ?? []).filter((notificacao) => !notificacao.lida).length

  async function marcarLida(id) {
    setErro(null)
    try {
      await notificacoes.marcarLida(id)
      consulta.definir((lista) => lista.map((n) => (n.id === id ? { ...n, lida: true } : n)))
      atualizar()
    } catch (falha) {
      setErro(falha.message)
    }
  }

  async function marcarTodas() {
    setMarcando(true)
    setErro(null)
    try {
      await notificacoes.marcarTodas()
      consulta.definir((lista) => lista.map((n) => ({ ...n, lida: true })))
      atualizar()
    } catch (falha) {
      setErro(falha.message)
    } finally {
      setMarcando(false)
    }
  }

  return (
    <Pagina
      titulo="Notificações"
      descricao="Avisos sobre solicitações, confirmações, recusas, cancelamentos e lembretes de viagem."
      largura="max-w-3xl"
      acoes={
        naoLidas > 0 && (
          <Botao variante="contorno" icone={CheckCheck} carregando={marcando} onClick={marcarTodas}>
            Marcar todas como lidas
          </Botao>
        )
      }
    >
      {erro && (
        <Alerta tipo="erro" className="mb-4">
          {erro}
        </Alerta>
      )}
      <Estado consulta={consulta} textoCarregando="Carregando notificações…">
        {(lista) =>
          lista.length === 0 ? (
            <Vazio icone={Inbox} titulo="Tudo em dia">
              Quando houver novidade sobre suas reservas, ela aparece aqui e também chega por e-mail.
            </Vazio>
          ) : (
            <ul className="space-y-3">
              {lista.map((notificacao) => {
                const { icone: Icone, classe, titulo } = TIPOS[notificacao.tipo] ?? PADRAO
                return (
                  <li
                    key={notificacao.id}
                    className={cx(
                      'flex items-start gap-4 rounded-3xl border p-4 sm:p-5',
                      notificacao.lida ? 'border-petroleo-900/10 bg-white/70' : 'border-coral-500/40 bg-white shadow-cartao',
                    )}
                  >
                    <span className={cx('grid size-11 shrink-0 place-items-center rounded-2xl', classe)}>
                      <Icone aria-hidden="true" className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-display font-bold text-petroleo-950">{titulo}</span>
                        {!notificacao.lida && (
                          <span className="rounded-full bg-coral-500 px-2 py-0.5 text-[0.6875rem] leading-none font-bold text-petroleo-950">
                            Nova
                          </span>
                        )}
                      </p>
                      <p className={cx('mt-1 text-sm leading-relaxed break-words', notificacao.lida ? 'text-tinta-suave' : 'text-tinta')}>
                        {notificacao.mensagem}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-tinta-suave">
                        <span>{fmtQuando(notificacao.criadaEm)}</span>
                        {atalho && (
                          <Link to={atalho.para} className="elo">
                            {atalho.rotulo}
                          </Link>
                        )}
                        {!notificacao.lida && (
                          <button type="button" onClick={() => marcarLida(notificacao.id)} className="elo">
                            Marcar como lida
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )
        }
      </Estado>
    </Pagina>
  )
}
