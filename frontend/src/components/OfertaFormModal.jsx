// Formulário de cadastro e edição de oferta pelo fornecedor (RF-03).
// Os campos mudam conforme o tipo: passagem, hospedagem ou passeio.
import { useState } from 'react'
import { BedDouble, Bus, Mountain, Save } from 'lucide-react'
import { fornecedor } from '../api/index.js'
import { cx, hojeIso } from '../lib/formato.js'
import { comValorAtual, useOpcoes } from '../lib/hooks.js'
import { HOSPEDAGENS, rotuloHospedagem, TIPOS_OFERTA } from '../lib/oferta.js'
import { Alerta, AreaTexto, Botao, Chips, Entrada, Modal, Selecao, Selo } from './ui.jsx'

const TIPOS = [
  { id: 'PASSAGEM', rotulo: 'Passagem', texto: 'Trecho aéreo ou rodoviário', icone: Bus },
  { id: 'HOSPEDAGEM', rotulo: 'Hospedagem', texto: 'Hotel, pousada, hostel ou casa', icone: BedDouble },
  { id: 'PASSEIO', rotulo: 'Passeio', texto: 'Atividade com data marcada', icone: Mountain },
]

const CATEGORIAS_PADRAO = ['Natureza', 'Aventura', 'Cultura', 'Gastronomia', 'Praia', 'Vida noturna']
const COMODIDADES_PADRAO = ['Wi-Fi', 'Café da manhã', 'Piscina', 'Ar-condicionado', 'Estacionamento']

const VAZIO = {
  tipo: 'HOSPEDAGEM',
  titulo: '',
  descricao: '',
  cidade: '',
  preco: '',
  vagas: '',
  fotoUrl: '',
  origem: '',
  destino: '',
  tipoTransporte: 'RODOVIARIA',
  partida: '',
  chegada: '',
  tipoHospedagem: 'POUSADA',
  comodidades: [],
  capacidade: '2',
  categoria: '',
  data: '',
  horarioInicio: '08:00',
  duracaoHoras: '4',
}

const texto = (valor, padrao = '') => (valor === null || valor === undefined ? padrao : String(valor))

function paraFormulario(oferta, tipoInicial) {
  if (!oferta) return { ...VAZIO, tipo: tipoInicial ?? VAZIO.tipo }
  return {
    tipo: oferta.tipo,
    titulo: texto(oferta.titulo),
    descricao: texto(oferta.descricao),
    cidade: texto(oferta.cidade),
    preco: texto(oferta.preco),
    vagas: texto(oferta.vagas),
    fotoUrl: texto(oferta.fotoUrl),
    origem: texto(oferta.origem),
    destino: texto(oferta.destino),
    tipoTransporte: oferta.tipoTransporte ?? VAZIO.tipoTransporte,
    partida: texto(oferta.partida).slice(0, 16),
    chegada: texto(oferta.chegada).slice(0, 16),
    tipoHospedagem: oferta.tipoHospedagem ?? VAZIO.tipoHospedagem,
    comodidades: oferta.comodidades ?? [],
    capacidade: texto(oferta.capacidade, VAZIO.capacidade),
    categoria: texto(oferta.categoria),
    data: texto(oferta.data),
    horarioInicio: texto(oferta.horarioInicio, VAZIO.horarioInicio).slice(0, 5),
    duracaoHoras: texto(oferta.duracaoHoras, VAZIO.duracaoHoras),
  }
}

/** "AAAA-MM-DDTHH:mm" do campo datetime-local -> "AAAA-MM-DDTHH:mm:ss" da API. */
const comSegundos = (valor) => (valor && valor.length === 16 ? `${valor}:00` : valor || null)

function paraRequisicao(f) {
  const corpo = {
    tipo: f.tipo,
    titulo: f.titulo.trim(),
    descricao: f.descricao.trim(),
    cidade: null,
    preco: Number(f.preco),
    vagas: Number(f.vagas),
    fotoUrl: f.fotoUrl.trim() || null,
    origem: null,
    destino: null,
    tipoTransporte: null,
    partida: null,
    chegada: null,
    tipoHospedagem: null,
    comodidades: null,
    capacidade: null,
    categoria: null,
    data: null,
    horarioInicio: null,
    duracaoHoras: null,
  }
  if (f.tipo === 'PASSAGEM') {
    return {
      ...corpo,
      cidade: f.destino.trim(),
      origem: f.origem.trim(),
      destino: f.destino.trim(),
      tipoTransporte: f.tipoTransporte,
      partida: comSegundos(f.partida),
      chegada: comSegundos(f.chegada),
    }
  }
  if (f.tipo === 'HOSPEDAGEM') {
    return {
      ...corpo,
      cidade: f.cidade.trim(),
      tipoHospedagem: f.tipoHospedagem,
      comodidades: f.comodidades,
      capacidade: Number(f.capacidade),
    }
  }
  return {
    ...corpo,
    cidade: f.cidade.trim(),
    categoria: f.categoria,
    data: f.data,
    horarioInicio: f.horarioInicio,
    duracaoHoras: Number(f.duracaoHoras),
  }
}

export default function OfertaFormModal({ oferta, tipoInicial, aoFechar, aoSalvar }) {
  const editando = Boolean(oferta)
  const opcoes = useOpcoes()
  const [f, setF] = useState(() => paraFormulario(oferta, tipoInicial))
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState(null)
  const [campos, setCampos] = useState({})
  const mudar = (campo) => (evento) => setF((atual) => ({ ...atual, [campo]: evento.target.value }))

  const cidades = [...new Set([...opcoes.cidades, ...opcoes.origens, ...opcoes.destinos])].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  const categorias = comValorAtual(opcoes.categorias.length > 0 ? opcoes.categorias : CATEGORIAS_PADRAO, f.categoria)
  const tiposHospedagem = comValorAtual(
    opcoes.tiposHospedagem.length > 0 ? opcoes.tiposHospedagem : Object.keys(HOSPEDAGENS),
    f.tipoHospedagem,
  )
  const comodidades = [...new Set([...(opcoes.comodidades.length > 0 ? opcoes.comodidades : COMODIDADES_PADRAO), ...f.comodidades])]

  async function salvar(evento) {
    evento.preventDefault()
    setErro(null)
    setCampos({})
    if (f.tipo === 'PASSAGEM' && f.partida && f.chegada && f.chegada <= f.partida) {
      setCampos({ chegada: 'A chegada precisa ser depois da partida.' })
      return
    }
    setEnviando(true)
    try {
      const corpo = paraRequisicao(f)
      const salva = editando ? await fornecedor.atualizarOferta(oferta.id, corpo) : await fornecedor.criarOferta(corpo)
      aoSalvar(salva)
    } catch (falha) {
      setErro(falha.message)
      setCampos(falha.campos ?? {})
      setEnviando(false)
    }
  }

  return (
    <Modal aberto titulo={editando ? 'Editar oferta' : 'Nova oferta'} aoFechar={aoFechar} largura="max-w-2xl">
      <form onSubmit={salvar} className="space-y-5">
        {editando ? (
          <p className="flex items-center gap-2 text-sm text-tinta-suave">
            Tipo: <Selo>{TIPOS_OFERTA[f.tipo]?.rotulo}</Selo> (não muda na edição)
          </p>
        ) : (
          <fieldset>
            <legend className="rotulo">O que você vai oferecer?</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {TIPOS.map(({ id, rotulo, texto: descricao, icone: Icone }) => {
                const marcado = f.tipo === id
                return (
                  <label
                    key={id}
                    className={cx(
                      'flex cursor-pointer items-start gap-3 rounded-2xl border p-3 has-focus-visible:outline-3 has-focus-visible:outline-coral-500',
                      marcado ? 'border-petroleo-700 bg-petroleo-50' : 'border-petroleo-900/20 hover:border-petroleo-900/45',
                    )}
                  >
                    <input type="radio" name="tipo" value={id} checked={marcado} onChange={mudar('tipo')} className="sr-only" />
                    <Icone aria-hidden="true" className={cx('mt-0.5 size-5 shrink-0', marcado ? 'text-petroleo-800' : 'text-tinta-suave')} />
                    <span>
                      <span className="block text-sm font-bold text-petroleo-950">{rotulo}</span>
                      <span className="block text-xs text-tinta-suave">{descricao}</span>
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>
        )}

        <Entrada
          rotulo="Título"
          placeholder={
            f.tipo === 'PASSAGEM'
              ? 'Ex.: Salvador → Lençóis (ônibus leito)'
              : f.tipo === 'HOSPEDAGEM'
                ? 'Ex.: Pousada Serra Viva'
                : 'Ex.: Trilha da Cachoeira com guia'
          }
          value={f.titulo}
          onChange={mudar('titulo')}
          erro={campos.titulo}
          maxLength={120}
          required
        />

        <datalist id="cidades-conhecidas">
          {cidades.map((cidade) => (
            <option key={cidade} value={cidade} />
          ))}
        </datalist>

        {f.tipo === 'PASSAGEM' && (
          <>
            <div className="grid gap-5 sm:grid-cols-3">
              <Entrada rotulo="Origem" list="cidades-conhecidas" value={f.origem} onChange={mudar('origem')} erro={campos.origem} required />
              <Entrada rotulo="Destino" list="cidades-conhecidas" value={f.destino} onChange={mudar('destino')} erro={campos.destino} required />
              <Selecao rotulo="Transporte" value={f.tipoTransporte} onChange={mudar('tipoTransporte')} erro={campos.tipoTransporte} required>
                <option value="RODOVIARIA">Rodoviário</option>
                <option value="AEREA">Aéreo</option>
              </Selecao>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Entrada
                rotulo="Partida"
                type="datetime-local"
                min={editando ? undefined : `${hojeIso()}T00:00`}
                value={f.partida}
                onChange={mudar('partida')}
                erro={campos.partida}
                required
              />
              <Entrada
                rotulo="Chegada"
                type="datetime-local"
                min={f.partida || undefined}
                value={f.chegada}
                onChange={mudar('chegada')}
                erro={campos.chegada}
                required
              />
            </div>
          </>
        )}

        {f.tipo === 'HOSPEDAGEM' && (
          <>
            <div className="grid gap-5 sm:grid-cols-3">
              <Entrada rotulo="Cidade" list="cidades-conhecidas" value={f.cidade} onChange={mudar('cidade')} erro={campos.cidade} required />
              <Selecao rotulo="Tipo" value={f.tipoHospedagem} onChange={mudar('tipoHospedagem')} erro={campos.tipoHospedagem} required>
                {tiposHospedagem.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {rotuloHospedagem(tipo)}
                  </option>
                ))}
              </Selecao>
              <Entrada
                rotulo="Hóspedes por quarto"
                type="number"
                min={1}
                max={20}
                value={f.capacidade}
                onChange={mudar('capacidade')}
                erro={campos.capacidade}
                required
              />
            </div>
            <Chips
              legenda="Comodidades"
              opcoes={comodidades}
              selecionados={f.comodidades}
              aoAlternar={(comodidade) =>
                setF((atual) => ({
                  ...atual,
                  comodidades: atual.comodidades.includes(comodidade)
                    ? atual.comodidades.filter((item) => item !== comodidade)
                    : [...atual.comodidades, comodidade],
                }))
              }
            />
          </>
        )}

        {f.tipo === 'PASSEIO' && (
          <>
            <div className="grid gap-5 sm:grid-cols-2">
              <Entrada rotulo="Cidade" list="cidades-conhecidas" value={f.cidade} onChange={mudar('cidade')} erro={campos.cidade} required />
              <Selecao rotulo="Categoria" value={f.categoria} onChange={mudar('categoria')} erro={campos.categoria} required>
                <option value="">Escolha</option>
                {categorias.map((categoria) => (
                  <option key={categoria}>{categoria}</option>
                ))}
              </Selecao>
            </div>
            <div className="grid gap-5 sm:grid-cols-3">
              <Entrada rotulo="Data" type="date" min={editando ? undefined : hojeIso()} value={f.data} onChange={mudar('data')} erro={campos.data} required />
              <Entrada
                rotulo="Início"
                type="time"
                value={f.horarioInicio}
                onChange={mudar('horarioInicio')}
                erro={campos.horarioInicio}
                required
              />
              <Entrada
                rotulo="Duração (horas)"
                type="number"
                min={1}
                max={72}
                value={f.duracaoHoras}
                onChange={mudar('duracaoHoras')}
                erro={campos.duracaoHoras}
                required
              />
            </div>
          </>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <Entrada
            rotulo={f.tipo === 'HOSPEDAGEM' ? 'Diária por quarto (R$)' : 'Preço por pessoa (R$)'}
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            value={f.preco}
            onChange={mudar('preco')}
            erro={campos.preco}
            required
          />
          <Entrada
            rotulo={f.tipo === 'PASSAGEM' ? 'Assentos disponíveis' : f.tipo === 'HOSPEDAGEM' ? 'Quartos disponíveis' : 'Vagas'}
            type="number"
            min={0}
            step="1"
            value={f.vagas}
            onChange={mudar('vagas')}
            erro={campos.vagas}
            required
          />
        </div>

        <AreaTexto
          rotulo="Descrição"
          placeholder="Conte o que está incluído, ponto de encontro, regras e o que torna a oferta especial."
          value={f.descricao}
          onChange={mudar('descricao')}
          erro={campos.descricao}
          maxLength={2000}
          required
        />

        <Entrada
          rotulo="Link da foto (opcional)"
          type="url"
          placeholder="https://…"
          value={f.fotoUrl}
          onChange={mudar('fotoUrl')}
          erro={campos.fotoUrl}
          dica="Sem foto, mostramos uma ilustração com as cores do tipo de oferta."
        />

        {erro && <Alerta tipo="erro">{erro}</Alerta>}

        <div className="flex flex-wrap justify-end gap-2">
          <Botao variante="fantasma" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" icone={Save} carregando={enviando}>
            {editando ? 'Salvar alterações' : 'Publicar oferta'}
          </Botao>
        </div>
      </form>
    </Modal>
  )
}
