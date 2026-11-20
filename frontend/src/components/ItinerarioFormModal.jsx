import { useState } from 'react'
import { itinerarios } from '../api/index.js'
import { diasEntre, hojeIso, somarDias } from '../lib/formato.js'
import { Alerta, Botao, Entrada, Modal } from './ui.jsx'

/** Cria um itinerário novo ou edita nome, datas e pessoas de um existente. */
export default function ItinerarioFormModal({ itinerario, aoFechar, aoSalvar }) {
  const editando = Boolean(itinerario)
  const inicioPadrao = somarDias(hojeIso(), 7)
  const [f, setF] = useState({
    nome: itinerario?.nome ?? '',
    dataInicio: itinerario?.dataInicio ?? inicioPadrao,
    dataFim: itinerario?.dataFim ?? somarDias(inicioPadrao, 3),
    pessoas: String(itinerario?.pessoas ?? 1),
  })
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState(null)
  const [campos, setCampos] = useState({})
  const mudar = (campo) => (evento) => setF((atual) => ({ ...atual, [campo]: evento.target.value }))

  async function salvar(evento) {
    evento.preventDefault()
    setErro(null)
    setCampos({})
    if (diasEntre(f.dataInicio, f.dataFim) < 0) {
      setCampos({ dataFim: 'A data final precisa ser igual ou depois da inicial.' })
      return
    }
    const corpo = { nome: f.nome.trim(), dataInicio: f.dataInicio, dataFim: f.dataFim, pessoas: Number(f.pessoas) }
    setEnviando(true)
    try {
      const salvo = editando ? await itinerarios.atualizar(itinerario.id, corpo) : await itinerarios.criar(corpo)
      aoSalvar(salvo)
    } catch (falha) {
      setErro(falha.message)
      setCampos(falha.campos ?? {})
      setEnviando(false)
    }
  }

  return (
    <Modal aberto titulo={editando ? 'Editar itinerário' : 'Novo itinerário'} aoFechar={aoFechar}>
      <form onSubmit={salvar} className="space-y-5">
        <Entrada
          rotulo="Nome do itinerário"
          placeholder="Ex.: Chapada em 4 dias"
          value={f.nome}
          onChange={mudar('nome')}
          erro={campos.nome}
          maxLength={80}
          required
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Entrada
            rotulo="Início da viagem"
            type="date"
            value={f.dataInicio}
            onChange={mudar('dataInicio')}
            erro={campos.dataInicio}
            required
          />
          <Entrada
            rotulo="Fim da viagem"
            type="date"
            min={f.dataInicio}
            value={f.dataFim}
            onChange={mudar('dataFim')}
            erro={campos.dataFim}
            required
          />
        </div>
        <Entrada
          rotulo="Quantas pessoas viajam?"
          type="number"
          min={1}
          max={20}
          value={f.pessoas}
          onChange={mudar('pessoas')}
          erro={campos.pessoas}
          required
        />
        {editando && (
          <Alerta tipo="info">
            Mudar as datas não move os itens: confira os alertas de conflito depois de salvar.
          </Alerta>
        )}
        {erro && <Alerta tipo="erro">{erro}</Alerta>}
        <div className="flex flex-wrap justify-end gap-2">
          <Botao variante="fantasma" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" carregando={enviando}>
            {editando ? 'Salvar alterações' : 'Criar itinerário'}
          </Botao>
        </div>
      </form>
    </Modal>
  )
}
