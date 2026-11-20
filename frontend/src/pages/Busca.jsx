// Telas de busca de passagens (RF-04), hospedagens (RF-05) e passeios (RF-06).
// O estado da busca mora na query string: dá para compartilhar o link e usar o botão voltar.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BedDouble, Bus, Mountain, Search, SearchX, SlidersHorizontal } from 'lucide-react'
import { ofertas } from '../api/index.js'
import OfertaCard from '../components/OfertaCard.jsx'
import { Alerta, Botao, Carregando, Entrada, ErroAoCarregar, Pagina, Selecao, Vazio } from '../components/ui.jsx'
import { cx, diasEntre, hojeIso, moeda, plural } from '../lib/formato.js'
import { comValorAtual, useDados, useOpcoes } from '../lib/hooks.js'
import { custoEstimado, quartosNecessarios, rotuloHospedagem } from '../lib/oferta.js'

/** Lê e grava os parâmetros de busca na URL. */
function useConsulta(chaves) {
  const [parametros, setParametros] = useSearchParams()
  const texto = parametros.toString()

  const consulta = useMemo(() => {
    const lidos = new URLSearchParams(texto)
    return Object.fromEntries(chaves.map((chave) => [chave, lidos.get(chave) ?? '']))
  }, [texto, chaves])

  const aplicar = useCallback(
    (novo) => {
      const limpo = {}
      for (const chave of chaves) {
        if (novo[chave] !== '' && novo[chave] != null) limpo[chave] = novo[chave]
      }
      setParametros(limpo)
    },
    [chaves, setParametros],
  )

  return [consulta, aplicar, texto]
}

/** Formulário cujo rascunho acompanha a URL (inclusive ao usar voltar/avançar do navegador). */
function useRascunho(consulta, aplicar) {
  const [form, setForm] = useState(consulta)
  useEffect(() => {
    setForm(consulta)
  }, [consulta])

  const mudar = (campo) => (evento) => setForm((atual) => ({ ...atual, [campo]: evento.target.value }))
  // Filtros de escolha (selects, rádios, caixas) aplicam na hora.
  const mudarEAplicar = (campo) => (evento) => {
    const novo = { ...form, [campo]: evento.target.value }
    setForm(novo)
    aplicar(novo)
  }
  const definirEAplicar = (campo, valor) => {
    const novo = { ...form, [campo]: valor }
    setForm(novo)
    aplicar(novo)
  }

  return { form, mudar, mudarEAplicar, definirEAplicar }
}

function Estrutura({
  titulo,
  descricao,
  formulario,
  filtros,
  aoFiltrar,
  aoLimpar,
  temFiltros,
  resultado,
  ordenacao,
  nomes,
  iconeVazio,
  renderOferta,
  aviso,
}) {
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)
  const lista = resultado.dados ?? []

  return (
    <Pagina titulo={titulo} descricao={descricao}>
      {formulario}

      <div className="mt-6 grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start">
        <aside aria-label="Filtros">
          <Botao
            variante="contorno"
            icone={SlidersHorizontal}
            className="w-full lg:hidden"
            aria-expanded={filtrosAbertos}
            aria-controls="painel-filtros"
            onClick={() => setFiltrosAbertos((v) => !v)}
          >
            {filtrosAbertos ? 'Esconder filtros' : 'Mostrar filtros'}
          </Botao>
          <form
            id="painel-filtros"
            onSubmit={(evento) => {
              evento.preventDefault()
              aoFiltrar()
            }}
            className={cx('cartao mt-3 space-y-5 p-5 lg:mt-0 lg:block', filtrosAbertos ? 'block' : 'hidden')}
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold text-petroleo-950">Filtros</h2>
              {temFiltros && (
                <button type="button" onClick={aoLimpar} className="text-sm font-semibold text-coral-700 underline underline-offset-4">
                  Limpar
                </button>
              )}
            </div>
            {filtros}
          </form>
        </aside>

        <section aria-label="Resultados" className="min-w-0">
          {aviso}
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <p className="text-sm font-semibold text-petroleo-950" role="status" aria-live="polite">
              {resultado.carregando
                ? 'Buscando…'
                : resultado.erro
                  ? ''
                  : lista.length === 0
                    ? nomes[0]
                    : plural(lista.length, nomes[1], nomes[2])}
            </p>
            {ordenacao}
          </div>

          {resultado.carregando ? (
            <Carregando texto="Buscando as melhores ofertas…" />
          ) : resultado.erro ? (
            <ErroAoCarregar mensagem={resultado.erro} aoTentar={resultado.recarregar} />
          ) : lista.length === 0 ? (
            <Vazio icone={iconeVazio ?? SearchX} titulo="Nada por aqui com esses filtros">
              Tente outra data, tire algum filtro ou busque sem escolher a cidade para ver todas as ofertas.
            </Vazio>
          ) : (
            <ul className="grid gap-4">
              {lista.map((oferta) => (
                <li key={oferta.id}>{renderOferta(oferta)}</li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Pagina>
  )
}

function Ordenar({ valor, aoMudar, opcoes }) {
  return (
    <label className="flex items-center gap-2 text-sm font-semibold text-petroleo-900">
      Ordenar por
      <select value={valor} onChange={aoMudar} className="campo min-h-10 w-auto py-1.5 pr-8 text-sm">
        {opcoes.map(([id, rotulo]) => (
          <option key={id} value={id}>
            {rotulo}
          </option>
        ))}
      </select>
    </label>
  )
}

function GrupoDeRadios({ legenda, nome, valor, opcoes, aoMudar }) {
  return (
    <fieldset>
      <legend className="rotulo">{legenda}</legend>
      <div className="space-y-1.5">
        {opcoes.map(([id, rotulo]) => (
          <label key={id} className="flex cursor-pointer items-center gap-2.5 text-sm text-tinta">
            <input
              type="radio"
              name={nome}
              value={id}
              checked={valor === id}
              onChange={aoMudar}
              className="size-4 accent-petroleo-800"
            />
            {rotulo}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function PrecoMaximo({ valor, aoMudar, aoSair, rotulo = 'Preço máximo (R$)' }) {
  return (
    <Entrada
      rotulo={rotulo}
      type="number"
      min={0}
      step="any"
      inputMode="decimal"
      placeholder="Sem limite"
      value={valor}
      onChange={aoMudar}
      onBlur={aoSair}
      dica="Enter ou sair do campo aplica."
    />
  )
}

function OpcoesDeCidade({ lista, vazio }) {
  return (
    <>
      <option value="">{vazio}</option>
      {lista.map((cidade) => (
        <option key={cidade}>{cidade}</option>
      ))}
    </>
  )
}

/* ------------------------------------------------------------------ Passagens */

const CHAVES_PASSAGENS = ['origem', 'destino', 'data', 'passageiros', 'precoMax', 'tipo', 'horario', 'ordenar']

export function BuscaPassagens() {
  const [consulta, aplicar, texto] = useConsulta(CHAVES_PASSAGENS)
  const { form, mudar, mudarEAplicar } = useRascunho(consulta, aplicar)
  const opcoes = useOpcoes()
  const resultado = useDados(() => ofertas.passagens(consulta), [texto])
  const passageiros = Math.max(1, Number(consulta.passageiros) || 1)
  const temFiltros = Boolean(consulta.precoMax || consulta.tipo || consulta.horario)

  return (
    <Estrutura
      titulo="Passagens"
      descricao="Trechos aéreos e rodoviários de fornecedores cadastrados. Filtre por preço, horário e tipo de transporte."
      nomes={['Nenhuma passagem encontrada', 'passagem encontrada', 'passagens encontradas']}
      iconeVazio={Bus}
      resultado={resultado}
      temFiltros={temFiltros}
      aoFiltrar={() => aplicar(form)}
      aoLimpar={() => aplicar({ ...form, precoMax: '', tipo: '', horario: '' })}
      formulario={
        <form
          onSubmit={(evento) => {
            evento.preventDefault()
            aplicar(form)
          }}
          className="cartao grid items-end gap-4 p-5 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_8rem_auto]"
        >
          <Selecao rotulo="Saindo de" value={form.origem} onChange={mudar('origem')}>
            <OpcoesDeCidade lista={comValorAtual(opcoes.origens, form.origem)} vazio="Qualquer origem" />
          </Selecao>
          <Selecao rotulo="Indo para" value={form.destino} onChange={mudar('destino')}>
            <OpcoesDeCidade lista={comValorAtual(opcoes.destinos, form.destino)} vazio="Qualquer destino" />
          </Selecao>
          <Entrada rotulo="Data da viagem" type="date" min={hojeIso()} value={form.data} onChange={mudar('data')} />
          <Entrada
            rotulo="Passageiros"
            type="number"
            min={1}
            max={50}
            value={form.passageiros}
            onChange={mudar('passageiros')}
            placeholder="1"
          />
          <Botao type="submit" variante="acento" icone={Search} className="min-h-11 sm:col-span-2 lg:col-span-1">
            Buscar
          </Botao>
        </form>
      }
      filtros={
        <>
          <GrupoDeRadios
            legenda="Tipo de transporte"
            nome="tipo"
            valor={form.tipo}
            aoMudar={mudarEAplicar('tipo')}
            opcoes={[
              ['', 'Todos'],
              ['RODOVIARIA', 'Rodoviário (ônibus)'],
              ['AEREA', 'Aéreo'],
            ]}
          />
          <GrupoDeRadios
            legenda="Horário de partida"
            nome="horario"
            valor={form.horario}
            aoMudar={mudarEAplicar('horario')}
            opcoes={[
              ['', 'Qualquer horário'],
              ['MANHA', 'Manhã (05h às 12h)'],
              ['TARDE', 'Tarde (12h às 18h)'],
              ['NOITE', 'Noite (18h às 05h)'],
            ]}
          />
          <PrecoMaximo valor={form.precoMax} aoMudar={mudar('precoMax')} aoSair={() => form.precoMax !== consulta.precoMax && aplicar(form)} rotulo="Preço máximo por pessoa (R$)" />
        </>
      }
      ordenacao={
        <Ordenar
          valor={form.ordenar || 'preco'}
          aoMudar={mudarEAplicar('ordenar')}
          opcoes={[
            ['preco', 'Menor preço'],
            ['duracao', 'Menor duração'],
          ]}
        />
      }
      renderOferta={(oferta) => (
        <OfertaCard
          oferta={oferta}
          consulta={`pessoas=${passageiros}`}
          resumo={passageiros > 1 ? `${moeda(custoEstimado(oferta, { pessoas: passageiros }))} para ${passageiros} pessoas` : null}
        />
      )}
    />
  )
}

/* ---------------------------------------------------------------- Hospedagens */

const CHAVES_HOSPEDAGENS = ['cidade', 'checkin', 'checkout', 'hospedes', 'precoMax', 'tipo', 'notaMin', 'comodidades', 'ordenar']

export function BuscaHospedagens() {
  const [consulta, aplicar, texto] = useConsulta(CHAVES_HOSPEDAGENS)
  const { form, mudar, mudarEAplicar, definirEAplicar } = useRascunho(consulta, aplicar)
  const opcoes = useOpcoes()
  const [erroDeDatas, setErroDeDatas] = useState(null)
  const resultado = useDados(() => ofertas.hospedagens(consulta), [texto])

  const hospedes = Math.max(1, Number(consulta.hospedes) || 1)
  const noites = consulta.checkin && consulta.checkout ? diasEntre(consulta.checkin, consulta.checkout) : 0
  const comodidadesMarcadas = form.comodidades ? form.comodidades.split(',') : []
  const temFiltros = Boolean(consulta.precoMax || consulta.tipo || consulta.notaMin || consulta.comodidades)

  function buscar(evento) {
    evento.preventDefault()
    if (form.checkin && form.checkout && diasEntre(form.checkin, form.checkout) < 1) {
      setErroDeDatas('O check-out precisa ser depois do check-in.')
      return
    }
    setErroDeDatas(null)
    aplicar(form)
  }

  function alternarComodidade(comodidade) {
    const novas = comodidadesMarcadas.includes(comodidade)
      ? comodidadesMarcadas.filter((item) => item !== comodidade)
      : [...comodidadesMarcadas, comodidade]
    definirEAplicar('comodidades', novas.join(','))
  }

  function consultaDoDetalhe() {
    const parametros = new URLSearchParams({ pessoas: String(hospedes) })
    if (noites > 0) {
      parametros.set('checkin', consulta.checkin)
      parametros.set('noites', String(noites))
    }
    return parametros.toString()
  }

  function resumo(oferta) {
    if (noites < 1) return null
    const quartos = quartosNecessarios(oferta, hospedes)
    const total = moeda(custoEstimado(oferta, { pessoas: hospedes, noites }))
    return `${total} por ${plural(noites, 'noite', 'noites')}${quartos > 1 ? ` em ${quartos} quartos` : ''}`
  }

  return (
    <Estrutura
      titulo="Hospedagens"
      descricao="Hotéis, pousadas, hostels e casas. O preço mostrado é a diária por quarto."
      nomes={['Nenhuma hospedagem encontrada', 'hospedagem encontrada', 'hospedagens encontradas']}
      iconeVazio={BedDouble}
      resultado={resultado}
      temFiltros={temFiltros}
      aoFiltrar={() => aplicar(form)}
      aoLimpar={() => aplicar({ ...form, precoMax: '', tipo: '', notaMin: '', comodidades: '' })}
      formulario={
        <form onSubmit={buscar} className="cartao grid items-end gap-4 p-5 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_8rem_auto]">
          <Selecao rotulo="Cidade" value={form.cidade} onChange={mudar('cidade')}>
            <OpcoesDeCidade lista={comValorAtual(opcoes.cidades, form.cidade)} vazio="Qualquer cidade" />
          </Selecao>
          <Entrada rotulo="Check-in" type="date" min={hojeIso()} value={form.checkin} onChange={mudar('checkin')} />
          <Entrada
            rotulo="Check-out"
            type="date"
            min={form.checkin || hojeIso()}
            value={form.checkout}
            onChange={mudar('checkout')}
            erro={erroDeDatas}
          />
          <Entrada
            rotulo="Hóspedes"
            type="number"
            min={1}
            max={50}
            value={form.hospedes}
            onChange={mudar('hospedes')}
            placeholder="1"
          />
          <Botao type="submit" variante="acento" icone={Search} className="min-h-11 sm:col-span-2 lg:col-span-1">
            Buscar
          </Botao>
        </form>
      }
      filtros={
        <>
          <Selecao rotulo="Tipo de hospedagem" value={form.tipo} onChange={mudarEAplicar('tipo')}>
            <option value="">Todos</option>
            {comValorAtual(opcoes.tiposHospedagem, form.tipo).map((tipo) => (
              <option key={tipo} value={tipo}>
                {rotuloHospedagem(tipo)}
              </option>
            ))}
          </Selecao>
          <Selecao rotulo="Nota mínima" value={form.notaMin} onChange={mudarEAplicar('notaMin')}>
            <option value="">Qualquer nota</option>
            <option value="3">3,0 ou mais</option>
            <option value="4">4,0 ou mais</option>
            <option value="4.5">4,5 ou mais</option>
          </Selecao>
          <PrecoMaximo valor={form.precoMax} aoMudar={mudar('precoMax')} aoSair={() => form.precoMax !== consulta.precoMax && aplicar(form)} rotulo="Diária máxima (R$)" />
          {opcoes.comodidades.length > 0 && (
            <fieldset>
              <legend className="rotulo">Comodidades</legend>
              <div className="space-y-1.5">
                {opcoes.comodidades.map((comodidade) => (
                  <label key={comodidade} className="flex cursor-pointer items-center gap-2.5 text-sm text-tinta">
                    <input
                      type="checkbox"
                      checked={comodidadesMarcadas.includes(comodidade)}
                      onChange={() => alternarComodidade(comodidade)}
                      className="size-4 rounded accent-petroleo-800"
                    />
                    {comodidade}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        </>
      }
      ordenacao={
        <Ordenar
          valor={form.ordenar || 'preco'}
          aoMudar={mudarEAplicar('ordenar')}
          opcoes={[
            ['preco', 'Menor preço'],
            ['nota', 'Melhor nota'],
          ]}
        />
      }
      aviso={
        consulta.checkin && !consulta.checkout ? (
          <Alerta tipo="info" className="mb-4">
            Informe também o check-out para ver o total da estadia em cada hospedagem.
          </Alerta>
        ) : null
      }
      renderOferta={(oferta) => <OfertaCard oferta={oferta} consulta={consultaDoDetalhe()} resumo={resumo(oferta)} />}
    />
  )
}

/* ------------------------------------------------------------------- Passeios */

const CHAVES_PASSEIOS = ['cidade', 'data', 'dataFim', 'precoMax', 'categoria', 'ordenar']

export function BuscaPasseios() {
  const [consulta, aplicar, texto] = useConsulta(CHAVES_PASSEIOS)
  const { form, mudar, mudarEAplicar } = useRascunho(consulta, aplicar)
  const opcoes = useOpcoes()
  const [erroDeDatas, setErroDeDatas] = useState(null)
  const resultado = useDados(() => ofertas.passeios(consulta), [texto])
  const temFiltros = Boolean(consulta.precoMax || consulta.categoria)

  function buscar(evento) {
    evento.preventDefault()
    if (form.dataFim && !form.data) {
      setErroDeDatas('Informe a data inicial do período.')
      return
    }
    if (form.data && form.dataFim && diasEntre(form.data, form.dataFim) < 0) {
      setErroDeDatas('A data final precisa ser igual ou depois da inicial.')
      return
    }
    setErroDeDatas(null)
    aplicar(form)
  }

  return (
    <Estrutura
      titulo="Passeios"
      descricao="Trilhas, praias, cultura e gastronomia com guias e operadores locais. O preço é por pessoa."
      nomes={['Nenhum passeio encontrado', 'passeio encontrado', 'passeios encontrados']}
      iconeVazio={Mountain}
      resultado={resultado}
      temFiltros={temFiltros}
      aoFiltrar={() => aplicar(form)}
      aoLimpar={() => aplicar({ ...form, precoMax: '', categoria: '' })}
      formulario={
        <form onSubmit={buscar} className="cartao grid items-end gap-4 p-5 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_auto]">
          <Selecao rotulo="Cidade" value={form.cidade} onChange={mudar('cidade')}>
            <OpcoesDeCidade lista={comValorAtual(opcoes.cidades, form.cidade)} vazio="Qualquer cidade" />
          </Selecao>
          <Entrada rotulo="Data" type="date" min={hojeIso()} value={form.data} onChange={mudar('data')} />
          <Entrada
            rotulo="Até (opcional)"
            type="date"
            min={form.data || hojeIso()}
            value={form.dataFim}
            onChange={mudar('dataFim')}
            erro={erroDeDatas}
          />
          <Botao type="submit" variante="acento" icone={Search} className="min-h-11 sm:col-span-2 lg:col-span-1">
            Buscar
          </Botao>
        </form>
      }
      filtros={
        <>
          <Selecao rotulo="Categoria" value={form.categoria} onChange={mudarEAplicar('categoria')}>
            <option value="">Todas</option>
            {comValorAtual(opcoes.categorias, form.categoria).map((categoria) => (
              <option key={categoria}>{categoria}</option>
            ))}
          </Selecao>
          <PrecoMaximo valor={form.precoMax} aoMudar={mudar('precoMax')} aoSair={() => form.precoMax !== consulta.precoMax && aplicar(form)} rotulo="Preço máximo por pessoa (R$)" />
        </>
      }
      ordenacao={
        <Ordenar
          valor={form.ordenar || 'preco'}
          aoMudar={mudarEAplicar('ordenar')}
          opcoes={[
            ['preco', 'Menor preço'],
            ['nota', 'Melhor nota'],
            ['data', 'Data mais próxima'],
          ]}
        />
      }
      renderOferta={(oferta) => <OfertaCard oferta={oferta} />}
    />
  )
}
