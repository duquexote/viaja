// Peças de interface reutilizadas em todas as telas.
import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, CircleAlert, CircleCheck, Info, LoaderCircle, Star, TriangleAlert, X } from 'lucide-react'
import { cx, fmtNota, plural } from '../lib/formato.js'
import { useTitulo } from '../lib/hooks.js'
import { STATUS_RESERVA } from '../lib/oferta.js'

/* ---------- Botões ---------- */

export function Botao({
  variante = 'primario',
  tamanho,
  carregando = false,
  icone: Icone,
  children,
  className,
  type = 'button',
  disabled,
  ...resto
}) {
  return (
    <button
      type={type}
      disabled={disabled || carregando}
      className={cx('btn', `btn-${variante}`, tamanho && `btn-${tamanho}`, className)}
      {...resto}
    >
      {carregando ? (
        <LoaderCircle aria-hidden="true" className="size-4 shrink-0 animate-spin" />
      ) : (
        Icone && <Icone aria-hidden="true" className="size-4 shrink-0" />
      )}
      {children}
    </button>
  )
}

export function LinkBotao({ variante = 'primario', tamanho, icone: Icone, children, className, ...resto }) {
  return (
    <Link className={cx('btn', `btn-${variante}`, tamanho && `btn-${tamanho}`, className)} {...resto}>
      {Icone && <Icone aria-hidden="true" className="size-4 shrink-0" />}
      {children}
    </Link>
  )
}

/* ---------- Campos de formulário ---------- */

function Moldura({ id, rotulo, erro, dica, obrigatorio, className, children }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="rotulo">
        {rotulo}
        {obrigatorio && (
          <span aria-hidden="true" className="text-coral-700">
            {' '}
            *
          </span>
        )}
      </label>
      {children}
      {dica && !erro && (
        <p id={`${id}-dica`} className="mt-1 text-xs text-tinta-suave">
          {dica}
        </p>
      )}
      {erro && (
        <p id={`${id}-erro`} className="mt-1 text-sm font-medium text-red-800">
          {erro}
        </p>
      )}
    </div>
  )
}

function propsDeAcessibilidade(id, erro, dica) {
  return {
    id,
    'aria-invalid': erro ? true : undefined,
    'aria-describedby': erro ? `${id}-erro` : dica ? `${id}-dica` : undefined,
  }
}

export function Entrada({ rotulo, erro, dica, className, id, ...props }) {
  const gerado = useId()
  const campoId = id ?? gerado
  return (
    <Moldura id={campoId} rotulo={rotulo} erro={erro} dica={dica} obrigatorio={props.required} className={className}>
      <input className={cx('campo', erro && 'border-red-600')} {...propsDeAcessibilidade(campoId, erro, dica)} {...props} />
    </Moldura>
  )
}

export function Selecao({ rotulo, erro, dica, className, id, children, ...props }) {
  const gerado = useId()
  const campoId = id ?? gerado
  return (
    <Moldura id={campoId} rotulo={rotulo} erro={erro} dica={dica} obrigatorio={props.required} className={className}>
      <select className={cx('campo', erro && 'border-red-600')} {...propsDeAcessibilidade(campoId, erro, dica)} {...props}>
        {children}
      </select>
    </Moldura>
  )
}

export function AreaTexto({ rotulo, erro, dica, className, id, ...props }) {
  const gerado = useId()
  const campoId = id ?? gerado
  return (
    <Moldura id={campoId} rotulo={rotulo} erro={erro} dica={dica} obrigatorio={props.required} className={className}>
      <textarea
        rows={4}
        className={cx('campo resize-y', erro && 'border-red-600')}
        {...propsDeAcessibilidade(campoId, erro, dica)}
        {...props}
      />
    </Moldura>
  )
}

/** Grupo de chips de múltipla escolha (interesses, comodidades). */
export function Chips({ legenda, opcoes, selecionados, aoAlternar, limite, dica, className }) {
  const cheio = limite != null && selecionados.length >= limite
  return (
    <fieldset className={className}>
      <legend className="rotulo">{legenda}</legend>
      <div className="flex flex-wrap gap-2">
        {opcoes.map((opcao) => {
          const marcado = selecionados.includes(opcao)
          return (
            <button
              key={opcao}
              type="button"
              aria-pressed={marcado}
              disabled={!marcado && cheio}
              onClick={() => aoAlternar(opcao)}
              className={cx(
                'rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                marcado
                  ? 'border-petroleo-800 bg-petroleo-800 text-white'
                  : 'border-petroleo-900/25 bg-white text-petroleo-900 hover:border-petroleo-800/70',
              )}
            >
              {opcao}
            </button>
          )
        })}
      </div>
      {dica && <p className="mt-2 text-xs text-tinta-suave">{dica}</p>}
    </fieldset>
  )
}

/* ---------- Mensagens e estados ---------- */

const ALERTAS = {
  erro: { classe: 'border-red-700/30 bg-red-50 text-red-950', Icone: CircleAlert },
  aviso: { classe: 'border-amber-700/35 bg-amber-50 text-amber-950', Icone: TriangleAlert },
  sucesso: { classe: 'border-emerald-700/30 bg-emerald-50 text-emerald-950', Icone: CircleCheck },
  info: { classe: 'border-petroleo-700/25 bg-petroleo-50 text-petroleo-950', Icone: Info },
}

export function Alerta({ tipo = 'erro', titulo, children, className, ...resto }) {
  const { classe, Icone } = ALERTAS[tipo] ?? ALERTAS.info
  return (
    <div
      role={tipo === 'erro' ? 'alert' : 'status'}
      className={cx('flex items-start gap-3 rounded-2xl border p-4 text-sm', classe, className)}
      {...resto}
    >
      <Icone aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      <div className="min-w-0 flex-1 space-y-1">
        {titulo && <p className="font-bold">{titulo}</p>}
        {children && <div className="leading-relaxed">{children}</div>}
      </div>
    </div>
  )
}

export function Carregando({ texto = 'Carregando…', className }) {
  return (
    <div role="status" aria-live="polite" className={cx('flex flex-col items-center gap-3 py-16 text-tinta-suave', className)}>
      <LoaderCircle aria-hidden="true" className="size-8 animate-spin text-petroleo-600" />
      <p className="text-sm font-medium">{texto}</p>
    </div>
  )
}

export function Vazio({ icone: Icone, titulo, children, acao, className }) {
  return (
    <div
      className={cx(
        'flex flex-col items-center rounded-3xl border border-dashed border-petroleo-900/25 bg-white/60 px-6 py-12 text-center',
        className,
      )}
    >
      {Icone && (
        <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-coral-100 text-coral-700">
          <Icone aria-hidden="true" className="size-7" />
        </span>
      )}
      <h2 className="font-display text-xl font-bold text-petroleo-950">{titulo}</h2>
      {children && <p className="mt-2 max-w-md text-sm leading-relaxed text-tinta-suave">{children}</p>}
      {acao && <div className="mt-5 flex flex-wrap justify-center gap-2">{acao}</div>}
    </div>
  )
}

export function ErroAoCarregar({ mensagem, aoTentar, className }) {
  return (
    <Alerta tipo="erro" titulo="Não foi possível carregar" className={className}>
      <p>{mensagem}</p>
      {aoTentar && (
        <button type="button" onClick={aoTentar} className="mt-1 font-bold underline underline-offset-4">
          Tentar de novo
        </button>
      )}
    </Alerta>
  )
}

/** Resolve os três estados de uma busca de dados e só chama `children` quando há dados. */
export function Estado({ consulta, textoCarregando, children }) {
  if (consulta.carregando && consulta.dados == null) return <Carregando texto={textoCarregando} />
  if (consulta.erro) return <ErroAoCarregar mensagem={consulta.erro} aoTentar={consulta.recarregar} />
  if (consulta.dados == null) return null
  return children(consulta.dados)
}

/* ---------- Selos ---------- */

export function Selo({ children, className, icone: Icone }) {
  return (
    <span className={cx('selo', className ?? 'bg-petroleo-100 text-petroleo-900')}>
      {Icone && <Icone aria-hidden="true" className="size-3.5" />}
      {children}
    </span>
  )
}

export function SeloStatus({ status }) {
  const info = STATUS_RESERVA[status] ?? { rotulo: status, classe: 'bg-slate-200 text-slate-800' }
  return <span className={cx('selo', info.classe)}>{info.rotulo}</span>
}

/* ---------- Avaliações ---------- */

export function NotaMedia({ nota, total, className }) {
  if (!total) return <span className={cx('text-xs text-tinta-suave', className)}>Ainda sem avaliações</span>
  return (
    <span className={cx('inline-flex items-center gap-1 text-sm font-bold text-petroleo-950', className)}>
      <Star aria-hidden="true" className="size-4 fill-sol-400 text-sol-500" />
      <span aria-hidden="true">{fmtNota(nota)}</span>
      <span aria-hidden="true" className="font-normal text-tinta-suave">
        ({total})
      </span>
      <span className="sr-only">
        Nota média {fmtNota(nota)} de 5, com base em {plural(total, 'avaliação', 'avaliações')}
      </span>
    </span>
  )
}

export function Estrelas({ nota, className }) {
  return (
    <span className={cx('inline-flex items-center gap-0.5', className)} role="img" aria-label={`Nota ${nota} de 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden="true"
          className={cx('size-4', n <= Math.round(nota) ? 'fill-sol-400 text-sol-500' : 'text-petroleo-900/25')}
        />
      ))}
    </span>
  )
}

export function EntradaEstrelas({ valor, aoMudar, legenda = 'Sua nota' }) {
  const nome = useId()
  return (
    <fieldset>
      <legend className="rotulo">{legenda}</legend>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <label
            key={n}
            className="cursor-pointer rounded-xl p-1 has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-coral-500"
          >
            <input
              type="radio"
              name={nome}
              value={n}
              checked={valor === n}
              onChange={() => aoMudar(n)}
              className="sr-only"
            />
            <Star
              aria-hidden="true"
              className={cx('size-9 transition-colors', n <= valor ? 'fill-sol-400 text-sol-500' : 'text-petroleo-900/30')}
            />
            <span className="sr-only">{plural(n, 'estrela', 'estrelas')}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

/* ---------- Abas e paginação ---------- */

/**
 * Abas em formato de pílula. Com muitas abas, a faixa rola para os lados.
 * `esticar` divide a largura por igual e empilha ícone e texto no celular (para poucas abas).
 */
export function Abas({ abas, atual, aoMudar, rotulo, className, esticar = false }) {
  return (
    <div
      role="tablist"
      aria-label={rotulo}
      className={cx(
        'flex max-w-full gap-1 overflow-x-auto bg-petroleo-900/8 p-1',
        esticar ? 'rounded-2xl sm:rounded-full' : 'rounded-full',
        className,
      )}
    >
      {abas.map((aba) => {
        const ativa = aba.id === atual
        return (
          <button
            key={aba.id}
            type="button"
            role="tab"
            aria-selected={ativa}
            onClick={() => aoMudar(aba.id)}
            className={cx(
              'inline-flex items-center font-semibold whitespace-nowrap transition-colors',
              esticar
                ? 'min-w-0 flex-1 flex-col justify-center gap-1 rounded-xl px-1 py-2 text-[0.6875rem] sm:flex-none sm:flex-row sm:gap-2 sm:rounded-full sm:px-4 sm:text-sm'
                : 'shrink-0 gap-2 rounded-full px-4 py-2 text-sm',
              ativa ? 'bg-white text-petroleo-950 shadow-sm' : 'text-petroleo-900/80 hover:text-petroleo-950',
            )}
          >
            {aba.icone && <aba.icone aria-hidden="true" className="size-4" />}
            {aba.rotulo}
            {aba.contador > 0 && (
              <span className="rounded-full bg-coral-500 px-1.5 py-0.5 text-[0.6875rem] leading-none font-bold text-petroleo-950">
                {aba.contador}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export function Paginacao({ pagina, totalPaginas, aoMudar }) {
  if (totalPaginas <= 1) return null
  return (
    <nav aria-label="Paginação" className="mt-6 flex items-center justify-center gap-3">
      <Botao variante="contorno" tamanho="sm" icone={ChevronLeft} disabled={pagina <= 1} onClick={() => aoMudar(pagina - 1)}>
        Anterior
      </Botao>
      <p className="text-sm font-medium text-tinta-suave" aria-live="polite">
        Página {pagina} de {totalPaginas}
      </p>
      <Botao variante="contorno" tamanho="sm" disabled={pagina >= totalPaginas} onClick={() => aoMudar(pagina + 1)}>
        Próxima
        <ChevronRight aria-hidden="true" className="size-4" />
      </Botao>
    </nav>
  )
}

/* ---------- Modal ---------- */

/** Janela modal sobre <dialog>: foco preso, Esc fecha e clique fora fecha. */
export function Modal({ aberto, titulo, aoFechar, children, largura = 'max-w-lg' }) {
  const ref = useRef(null)
  const focoAnterior = useRef(null)
  const idTitulo = useId()

  useEffect(() => {
    if (!aberto) return undefined
    const dialogo = ref.current
    if (dialogo && !dialogo.contains(document.activeElement)) focoAnterior.current = document.activeElement
    if (dialogo && !dialogo.open) dialogo.showModal()
    // Ao fechar, devolve o foco para o botão que abriu a janela.
    return () => focoAnterior.current?.focus?.()
  }, [aberto])

  if (!aberto) return null

  return createPortal(
    <dialog
      ref={ref}
      aria-labelledby={idTitulo}
      onCancel={(evento) => {
        evento.preventDefault()
        aoFechar()
      }}
      onMouseDown={(evento) => {
        if (evento.target === ref.current) aoFechar()
      }}
      className={cx(
        'm-auto max-h-[92dvh] w-[calc(100%-1.5rem)] overflow-y-auto rounded-3xl bg-white p-0 text-tinta shadow-flutuante backdrop:bg-petroleo-950/60 backdrop:backdrop-blur-[2px]',
        largura,
      )}
    >
      <div className="p-5 sm:p-7">
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 id={idTitulo} className="font-display text-xl font-bold text-petroleo-950 sm:text-2xl">
            {titulo}
          </h2>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="-m-1.5 rounded-full p-1.5 text-tinta-suave hover:bg-petroleo-900/10 hover:text-petroleo-950"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </dialog>,
    document.body,
  )
}

/* ---------- Estrutura de página ---------- */

export function Pagina({ titulo, tituloDaAba, descricao, sobretitulo, acoes, largura = 'max-w-7xl', children }) {
  useTitulo(tituloDaAba ?? titulo)
  return (
    <div className={cx('mx-auto w-full px-4 py-8 sm:px-6 sm:py-10 lg:px-8', largura)}>
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {sobretitulo && <div className="mb-2 text-sm font-semibold text-coral-700">{sobretitulo}</div>}
          <h1 className="font-display text-3xl font-extrabold tracking-tight break-words text-petroleo-950 sm:text-4xl">
            {titulo}
          </h1>
          {descricao && <p className="mt-2 max-w-2xl leading-relaxed text-tinta-suave">{descricao}</p>}
        </div>
        {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
      </header>
      {children}
    </div>
  )
}
