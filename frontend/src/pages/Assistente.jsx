// Assistente de roteiro com IA (RF-09): o viajante informa o pedido e recebe um itinerário
// sugerido só com ofertas cadastradas, que pode ajustar antes de salvar.
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bot, CalendarDays, Info, Save, Sparkles, Trash2, Users, Wallet } from 'lucide-react'
import { assistente, itinerarios } from '../api/index.js'
import { Alerta, Botao, Chips, Entrada, Pagina, Selecao, Selo } from '../components/ui.jsx'
import { cx, diasEntre, fmtData, fmtDataCurta, fmtDataExtenso, hojeIso, moeda, plural, somarDias } from '../lib/formato.js'
import { comValorAtual, useDados, useOpcoes } from '../lib/hooks.js'
import { iconeDaOferta, resumoDaOferta } from '../lib/oferta.js'

const LIMITE_INTERESSES = 3
const LIMITE_PADRAO = 5

const ETAPAS = [
  'Consultando as ofertas ativas do destino…',
  'Combinando transporte de ida e volta…',
  'Escolhendo a hospedagem que cabe no orçamento…',
  'Encaixando passeios nos seus interesses…',
  'Conferindo datas e custo total…',
]

function Gerando() {
  const [etapa, setEtapa] = useState(0)
  useEffect(() => {
    const temporizador = setInterval(() => setEtapa((atual) => (atual + 1) % ETAPAS.length), 2600)
    return () => clearInterval(temporizador)
  }, [])

  return (
    <div role="status" className="cartao flex flex-col items-center px-6 py-14 text-center">
      <span className="grid size-16 place-items-center rounded-3xl bg-petroleo-800 text-sol-300">
        <Sparkles aria-hidden="true" className="size-8 animate-pulse" />
      </span>
      <p className="mt-6 font-display text-2xl font-bold text-petroleo-950">Montando o seu roteiro</p>
      <p className="mt-2 text-sm text-tinta-suave">Isso pode levar até 15 segundos.</p>
      <div aria-hidden="true" className="mt-6 h-2 w-full max-w-xs overflow-hidden rounded-full bg-petroleo-900/10">
        <div className="h-full w-1/3 animate-trilha rounded-full bg-coral-500" />
      </div>
      <p aria-hidden="true" className="mt-4 min-h-5 text-sm font-medium text-petroleo-800">
        {ETAPAS[etapa]}
      </p>
    </div>
  )
}

function ComoFunciona() {
  return (
    <div className="cartao p-6 sm:p-8">
      <h2 className="font-display text-xl font-bold text-petroleo-950">Como o assistente trabalha</h2>
      <ol className="mt-5 space-y-4">
        {[
          ['Você conta o plano', 'Destino, datas, número de pessoas, orçamento total e até 3 interesses.'],
          ['A IA escolhe entre ofertas reais', 'Só entram passagens, hospedagens e passeios ativos no ViaJá. Nada é inventado.'],
          ['O sistema confere', 'Datas compatíveis entre transporte e hospedagem e custo dentro do orçamento.'],
          ['Você ajusta e salva', 'Tire o que não quiser, salve como itinerário e solicite as reservas.'],
        ].map(([titulo, texto], indice) => (
          <li key={titulo} className="flex gap-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-coral-100 font-display font-bold text-coral-800">
              {indice + 1}
            </span>
            <span>
              <span className="block font-bold text-petroleo-950">{titulo}</span>
              <span className="block text-sm leading-relaxed text-tinta-suave">{texto}</span>
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-6 flex items-start gap-2 rounded-2xl bg-areia-100 p-4 text-xs leading-relaxed text-tinta-suave">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        Seus dados pessoais (nome, e-mail, data de nascimento) não são enviados à IA. Só o pedido de viagem.
      </p>
    </div>
  )
}

function Resultado({ roteiro, aoDescartar }) {
  const navigate = useNavigate()
  const [removidos, setRemovidos] = useState(() => new Set())
  const [nome, setNome] = useState(
    `${roteiro.destino}: ${fmtDataCurta(roteiro.dataInicio)} a ${fmtDataCurta(roteiro.dataFim)}`,
  )
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(null)

  const chaveDe = (dia, item) => `${dia.dia}-${item.ofertaId}`
  const dias = (roteiro.dias ?? []).map((dia) => ({
    ...dia,
    itens: (dia.itens ?? []).filter((item) => !removidos.has(chaveDe(dia, item))),
  }))
  const mantidos = dias.flatMap((dia) => dia.itens.map((item) => ({ dia: dia.dia, ...item })))
  const custo = mantidos.reduce((soma, item) => soma + Number(item.custo ?? 0), 0)
  const orcamento = Number(roteiro.orcamento) || 0
  const uso = orcamento > 0 ? Math.min(100, Math.round((custo / orcamento) * 100)) : 0
  const padrao = roteiro.fonte === 'PADRAO'

  async function salvar(evento) {
    evento.preventDefault()
    setSalvando(true)
    setErro(null)
    try {
      const criado = await itinerarios.criar({
        nome: nome.trim(),
        dataInicio: roteiro.dataInicio,
        dataFim: roteiro.dataFim,
        pessoas: roteiro.pessoas,
        geradoPorIA: true,
        itens: mantidos.map((item) => ({
          ofertaId: item.ofertaId,
          dia: item.dia,
          horario: item.horario ?? null,
          noites: item.noites ?? null,
        })),
      })
      navigate(`/itinerarios/${criado.id}`)
    } catch (falha) {
      setErro(falha.message)
      setSalvando(false)
    }
  }

  return (
    <section aria-labelledby="titulo-roteiro" className="animate-surgir space-y-5">
      <p role="status" className="sr-only">
        Roteiro pronto: {plural(mantidos.length, 'item', 'itens')} em {plural(dias.length, 'dia', 'dias')}, custo estimado de{' '}
        {moeda(custo)}.
      </p>
      {padrao && (
        <Alerta tipo="aviso" titulo="Roteiro padrão">
          {roteiro.aviso ??
            'O assistente de IA não respondeu a tempo. Montamos um roteiro por regra simples, com as ofertas mais bem avaliadas que cabem no orçamento.'}
        </Alerta>
      )}

      <div className="cartao p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-2">
          <Selo icone={padrao ? Bot : Sparkles} className={padrao ? 'bg-amber-100 text-amber-900' : 'bg-coral-100 text-coral-800'}>
            {padrao ? 'Roteiro padrão (sem IA)' : 'Gerado por IA'}
          </Selo>
          <Selo icone={CalendarDays}>
            {fmtData(roteiro.dataInicio)} a {fmtData(roteiro.dataFim)}
          </Selo>
          <Selo icone={Users}>{plural(roteiro.pessoas, 'pessoa', 'pessoas')}</Selo>
        </div>
        <h2 id="titulo-roteiro" className="mt-3 font-display text-2xl font-extrabold text-petroleo-950 sm:text-3xl">
          {roteiro.origem ? `${roteiro.origem} → ${roteiro.destino}` : roteiro.destino}
        </h2>
        {roteiro.observacoes && <p className="mt-2 leading-relaxed text-tinta">{roteiro.observacoes}</p>}

        <div className="mt-5 rounded-2xl bg-areia-100 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-semibold text-petroleo-900">
              Custo estimado: <span className="font-display text-xl font-extrabold text-petroleo-950">{moeda(custo)}</span>
            </p>
            <p className="text-sm text-tinta-suave">Orçamento: {moeda(orcamento)}</p>
          </div>
          <div
            role="progressbar"
            aria-label="Uso do orçamento"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={uso}
            className="mt-3 h-2.5 overflow-hidden rounded-full bg-petroleo-900/12"
          >
            <div className={cx('h-full rounded-full', custo > orcamento ? 'bg-red-600' : 'bg-petroleo-600')} style={{ width: `${uso}%` }} />
          </div>
          <p className="mt-2 text-xs text-tinta-suave">
            {custo <= orcamento
              ? `Sobram ${moeda(orcamento - custo)} do orçamento informado.`
              : `Passa ${moeda(custo - orcamento)} do orçamento informado.`}
          </p>
        </div>
      </div>

      <ol className="space-y-4">
        {dias.map((dia) => (
          <li key={dia.dia} className="rounded-3xl bg-areia-100 p-4 sm:p-5">
            <h3 className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="rounded-full bg-petroleo-800 px-3 py-1 font-display text-sm font-bold text-white">Dia {dia.dia}</span>
              <span className="font-display text-lg font-bold text-petroleo-950 first-letter:uppercase">{fmtDataExtenso(dia.data)}</span>
            </h3>
            {dia.itens.length === 0 ? (
              <p className="mt-3 rounded-2xl border border-dashed border-petroleo-900/20 px-4 py-3 text-sm text-tinta-suave">
                Dia livre para descansar ou explorar por conta própria.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {dia.itens.map((item) => {
                  const Icone = iconeDaOferta(item.oferta)
                  return (
                    <li key={item.ofertaId} className="flex flex-wrap items-start gap-x-4 gap-y-2 rounded-2xl border border-petroleo-900/10 bg-white p-4">
                      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-petroleo-50 text-petroleo-800">
                        <Icone aria-hidden="true" className="size-5" />
                      </span>
                      <div className="min-w-0 flex-1 basis-48">
                        <p className="text-xs font-bold tracking-wide text-coral-700 uppercase">
                          {item.horario}
                          {item.noites ? ` · ${plural(item.noites, 'noite', 'noites')}` : ''}
                        </p>
                        <p className="font-display text-base leading-snug font-bold break-words text-petroleo-950">
                          <Link to={`/ofertas/${item.ofertaId}`} target="_blank" rel="noreferrer" className="hover:underline">
                            {item.oferta.titulo}
                            <span className="sr-only"> (abre em nova aba)</span>
                          </Link>
                        </p>
                        <p className="mt-0.5 text-sm text-tinta-suave">{resumoDaOferta(item.oferta)}</p>
                        {item.motivo && (
                          <p className="mt-2 flex items-start gap-1.5 text-sm leading-relaxed text-tinta">
                            <Sparkles aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-coral-600" />
                            {item.motivo}
                          </p>
                        )}
                      </div>
                      <div className="ml-auto flex items-center gap-2">
                        <p className="font-display text-lg font-extrabold whitespace-nowrap text-petroleo-950">{moeda(item.custo)}</p>
                        <button
                          type="button"
                          onClick={() => setRemovidos((atual) => new Set(atual).add(chaveDe(dia, item)))}
                          aria-label={`Tirar ${item.oferta.titulo} do roteiro`}
                          className="rounded-full p-2 text-red-800 hover:bg-red-50"
                        >
                          <Trash2 aria-hidden="true" className="size-4" />
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </li>
        ))}
      </ol>

      <form onSubmit={salvar} className="cartao space-y-4 p-5 sm:p-7">
        <h3 className="font-display text-xl font-bold text-petroleo-950">Gostou? Salve como itinerário</h3>
        <p className="text-sm text-tinta-suave">
          Depois de salvar você pode trocar itens, mudar dias e enviar as solicitações de reserva.
        </p>
        <Entrada rotulo="Nome do itinerário" value={nome} onChange={(evento) => setNome(evento.target.value)} maxLength={80} required />
        {removidos.size > 0 && (
          <p className="text-sm text-tinta-suave">
            {plural(removidos.size, 'item retirado', 'itens retirados')}.{' '}
            <button type="button" onClick={() => setRemovidos(new Set())} className="elo">
              Desfazer
            </button>
          </p>
        )}
        {erro && <Alerta tipo="erro">{erro}</Alerta>}
        <div className="flex flex-wrap gap-2">
          <Botao type="submit" variante="acento" tamanho="lg" icone={Save} carregando={salvando} disabled={mantidos.length === 0}>
            Salvar como itinerário
          </Botao>
          <Botao variante="fantasma" tamanho="lg" onClick={aoDescartar}>
            Descartar
          </Botao>
        </div>
      </form>
    </section>
  )
}

export default function Assistente() {
  const opcoes = useOpcoes()
  const uso = useDados(() => assistente.uso(), [])
  const inicio = somarDias(hojeIso(), 10)
  const [f, setF] = useState({
    origem: '',
    destino: '',
    dataIda: inicio,
    dataVolta: somarDias(inicio, 3),
    pessoas: '1',
    orcamento: '1500',
    interesses: [],
  })
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState(null)
  const [campos, setCampos] = useState({})
  const [roteiro, setRoteiro] = useState(null)
  const [limiteAtingido, setLimiteAtingido] = useState(false)

  const limite = uso.dados?.limite ?? LIMITE_PADRAO
  const restantes = limiteAtingido ? 0 : (uso.dados?.restantes ?? limite)
  const usados = Math.max(0, limite - restantes)
  const bloqueado = restantes <= 0
  const origens = comValorAtual(opcoes.origens, f.origem)
  const destinos = comValorAtual(opcoes.cidades.length > 0 ? opcoes.cidades : opcoes.destinos, f.destino)
  const origemEfetiva = f.origem || (opcoes.origens.includes('Salvador') ? 'Salvador' : (opcoes.origens[0] ?? ''))

  const mudar = (campo) => (evento) => setF((atual) => ({ ...atual, [campo]: evento.target.value }))
  const alternarInteresse = (interesse) =>
    setF((atual) => ({
      ...atual,
      interesses: atual.interesses.includes(interesse)
        ? atual.interesses.filter((item) => item !== interesse)
        : [...atual.interesses, interesse].slice(0, LIMITE_INTERESSES),
    }))

  async function gerar(evento) {
    evento.preventDefault()
    setErro(null)
    setCampos({})
    if (diasEntre(f.dataIda, f.dataVolta) < 0) {
      setCampos({ dataVolta: 'A volta precisa ser no mesmo dia ou depois da ida.' })
      return
    }
    setGerando(true)
    setRoteiro(null)
    try {
      const resposta = await assistente.roteiro({
        origem: origemEfetiva,
        destino: f.destino,
        dataIda: f.dataIda,
        dataVolta: f.dataVolta,
        pessoas: Number(f.pessoas),
        orcamento: Number(f.orcamento),
        interesses: f.interesses,
      })
      setRoteiro(resposta)
      if (resposta?.restantesHoje != null) {
        uso.definir((atual) => ({ limite, ...atual, restantes: resposta.restantesHoje, usados: limite - resposta.restantesHoje }))
      } else {
        uso.recarregar()
      }
    } catch (falha) {
      if (falha.status === 429) setLimiteAtingido(true)
      else uso.recarregar()
      setErro(falha.message)
      setCampos(falha.campos ?? {})
    } finally {
      setGerando(false)
    }
  }

  return (
    <Pagina
      titulo="Assistente de roteiro"
      sobretitulo={
        <span className="inline-flex items-center gap-1.5">
          <Sparkles aria-hidden="true" className="size-4" />
          Planejamento com IA
        </span>
      }
      descricao="Conte para onde vai, quando e quanto quer gastar. O assistente monta um roteiro dia a dia usando só ofertas cadastradas no ViaJá."
    >
      <div className="grid gap-7 lg:grid-cols-[24rem_minmax(0,1fr)] lg:items-start">
        <form onSubmit={gerar} className="cartao space-y-5 p-5 sm:p-6 lg:sticky lg:top-24">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
            <Selecao rotulo="Saindo de" value={origemEfetiva} onChange={mudar('origem')} erro={campos.origem} required>
              {origens.length === 0 && <option value="">Carregando…</option>}
              {origens.map((cidade) => (
                <option key={cidade}>{cidade}</option>
              ))}
            </Selecao>
            <Selecao rotulo="Destino" value={f.destino} onChange={mudar('destino')} erro={campos.destino} required>
              <option value="">Escolha o destino</option>
              {destinos
                .filter((cidade) => cidade !== origemEfetiva)
                .map((cidade) => (
                  <option key={cidade}>{cidade}</option>
                ))}
            </Selecao>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Entrada
              rotulo="Ida"
              type="date"
              min={hojeIso()}
              value={f.dataIda}
              onChange={mudar('dataIda')}
              erro={campos.dataIda}
              required
            />
            <Entrada
              rotulo="Volta"
              type="date"
              min={f.dataIda || hojeIso()}
              value={f.dataVolta}
              onChange={mudar('dataVolta')}
              erro={campos.dataVolta}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Entrada
              rotulo="Pessoas"
              type="number"
              min={1}
              max={20}
              value={f.pessoas}
              onChange={mudar('pessoas')}
              erro={campos.pessoas}
              required
            />
            <Entrada
              rotulo="Orçamento total (R$)"
              type="number"
              min={1}
              step="any"
              inputMode="decimal"
              value={f.orcamento}
              onChange={mudar('orcamento')}
              erro={campos.orcamento}
              required
            />
          </div>
          {opcoes.interesses.length > 0 && (
            <Chips
              legenda={`Interesses (até ${LIMITE_INTERESSES})`}
              opcoes={opcoes.interesses}
              selecionados={f.interesses}
              aoAlternar={alternarInteresse}
              limite={LIMITE_INTERESSES}
              dica={
                f.interesses.length >= LIMITE_INTERESSES
                  ? 'Limite de 3 interesses atingido. Desmarque um para trocar.'
                  : 'Opcional: ajuda a escolher os passeios.'
              }
            />
          )}

          {erro && !bloqueado && <Alerta tipo="erro">{erro}</Alerta>}
          {bloqueado && (
            <Alerta tipo="aviso" titulo="Limite diário atingido">
              Você já gerou {limite} roteiros hoje. O limite existe para controlar o custo da IA e volta a zero amanhã.
            </Alerta>
          )}

          <Botao type="submit" variante="acento" tamanho="lg" icone={Sparkles} carregando={gerando} disabled={bloqueado} className="w-full">
            {roteiro ? 'Gerar outro roteiro' : 'Gerar roteiro'}
          </Botao>
          <p className="flex items-center justify-center gap-2 text-sm text-tinta-suave" aria-live="polite">
            <Wallet aria-hidden="true" className="size-4" />
            {uso.carregando && !uso.dados ? 'Consultando seu limite…' : `${usados} de ${limite} roteiros gerados hoje`}
          </p>
        </form>

        <div className="min-w-0">
          {gerando ? (
            <Gerando />
          ) : roteiro ? (
            <Resultado key={JSON.stringify([roteiro.destino, roteiro.dataInicio, roteiro.restantesHoje])} roteiro={roteiro} aoDescartar={() => setRoteiro(null)} />
          ) : (
            <ComoFunciona />
          )}
        </div>
      </div>
    </Pagina>
  )
}
