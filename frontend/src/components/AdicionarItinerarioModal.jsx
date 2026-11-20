import { useState } from 'react'
import { CalendarPlus } from 'lucide-react'
import { itinerarios } from '../api/index.js'
import { useAvisos } from '../contexts/AvisosContext.jsx'
import { cx, fmtDataCurta, hojeIso, somarDias } from '../lib/formato.js'
import { useDados } from '../lib/hooks.js'
import { dataDeReferencia } from '../lib/oferta.js'
import { Alerta, Botao, Carregando, Entrada, ErroAoCarregar, Modal } from './ui.jsx'

const NOVO = 'novo'

/** Escolhe um itinerário existente (ou cria um novo) e adiciona a oferta nele. */
export default function AdicionarItinerarioModal({ oferta, aoFechar }) {
  const { avisar } = useAvisos()
  const lista = useDados(() => itinerarios.listar(), [])
  const inicioSugerido = dataDeReferencia(oferta) ?? somarDias(hojeIso(), 7)

  const [escolha, setEscolha] = useState(null)
  const [novo, setNovo] = useState({
    nome: `Viagem para ${oferta.cidade}`,
    dataInicio: inicioSugerido,
    dataFim: somarDias(inicioSugerido, 3),
    pessoas: 1,
  })
  const [enviando, setEnviando] = useState(false)
  const [falha, setFalha] = useState(null)

  const existentes = lista.dados ?? []
  // Sem escolha explícita: o primeiro itinerário existente ou, se não houver nenhum, criar um novo.
  const selecionado = escolha ?? (existentes.length > 0 ? String(existentes[0].id) : NOVO)
  const mudarNovo = (campo) => (evento) => setNovo((atual) => ({ ...atual, [campo]: evento.target.value }))

  async function confirmar(evento) {
    evento.preventDefault()
    setEnviando(true)
    setFalha(null)
    let itinerarioId = selecionado
    let criadoAgora = false
    try {
      if (selecionado === NOVO) {
        const criado = await itinerarios.criar({
          nome: novo.nome.trim(),
          dataInicio: novo.dataInicio,
          dataFim: novo.dataFim,
          pessoas: Number(novo.pessoas),
        })
        itinerarioId = String(criado.id)
        criadoAgora = true
      }
      await itinerarios.adicionarItem(itinerarioId, { ofertaId: oferta.id })
      avisar(`"${oferta.titulo}" entrou no itinerário.`, 'sucesso', {
        rotulo: 'Ver itinerário',
        para: `/itinerarios/${itinerarioId}`,
      })
      aoFechar()
    } catch (erro) {
      if (criadoAgora) {
        // O itinerário foi criado, mas a oferta não coube: mantém o novo selecionado para não criar outro.
        lista.recarregar()
        setEscolha(itinerarioId)
        setFalha(`O itinerário foi criado, mas a oferta não pôde ser adicionada: ${erro.message}`)
      } else {
        setFalha(erro.message)
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal aberto titulo="Adicionar ao itinerário" aoFechar={aoFechar}>
      <p className="mb-5 text-sm text-tinta-suave">
        Oferta: <strong className="text-petroleo-950">{oferta.titulo}</strong>
      </p>

      {lista.carregando && lista.dados == null ? (
        <Carregando texto="Buscando seus itinerários…" className="py-8" />
      ) : lista.erro ? (
        <ErroAoCarregar mensagem={lista.erro} aoTentar={lista.recarregar} />
      ) : (
        <form onSubmit={confirmar} className="space-y-5">
          <fieldset>
            <legend className="rotulo">Em qual itinerário?</legend>
            <div className="grid max-h-56 gap-2 overflow-y-auto pr-1">
              {existentes.map((itinerario) => {
                const marcado = selecionado === String(itinerario.id)
                return (
                  <label
                    key={itinerario.id}
                    className={cx(
                      'flex cursor-pointer items-center gap-3 rounded-2xl border p-3 has-focus-visible:outline-3 has-focus-visible:outline-coral-500',
                      marcado ? 'border-petroleo-700 bg-petroleo-50' : 'border-petroleo-900/15 hover:border-petroleo-900/40',
                    )}
                  >
                    <input
                      type="radio"
                      name="itinerario"
                      value={itinerario.id}
                      checked={marcado}
                      onChange={() => setEscolha(String(itinerario.id))}
                      className="size-4 accent-petroleo-800"
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-petroleo-950">{itinerario.nome}</span>
                      <span className="block text-xs text-tinta-suave">
                        {fmtDataCurta(itinerario.dataInicio)} a {fmtDataCurta(itinerario.dataFim)} ·{' '}
                        {itinerario.itens?.length ?? 0} itens
                      </span>
                    </span>
                  </label>
                )
              })}
              <label
                className={cx(
                  'flex cursor-pointer items-center gap-3 rounded-2xl border p-3 has-focus-visible:outline-3 has-focus-visible:outline-coral-500',
                  selecionado === NOVO
                    ? 'border-petroleo-700 bg-petroleo-50'
                    : 'border-dashed border-petroleo-900/30 hover:border-petroleo-900/50',
                )}
              >
                <input
                  type="radio"
                  name="itinerario"
                  value={NOVO}
                  checked={selecionado === NOVO}
                  onChange={() => setEscolha(NOVO)}
                  className="size-4 accent-petroleo-800"
                />
                <span className="font-semibold text-petroleo-950">Criar um novo itinerário</span>
              </label>
            </div>
          </fieldset>

          {selecionado === NOVO && (
            <div className="grid gap-4 rounded-2xl bg-areia-100 p-4 sm:grid-cols-2">
              <Entrada
                rotulo="Nome do itinerário"
                value={novo.nome}
                onChange={mudarNovo('nome')}
                required
                maxLength={80}
                className="sm:col-span-2"
              />
              <Entrada
                rotulo="Início"
                type="date"
                value={novo.dataInicio}
                min={hojeIso()}
                onChange={mudarNovo('dataInicio')}
                required
              />
              <Entrada
                rotulo="Fim"
                type="date"
                value={novo.dataFim}
                min={novo.dataInicio || hojeIso()}
                onChange={mudarNovo('dataFim')}
                required
              />
              <Entrada
                rotulo="Pessoas"
                type="number"
                min={1}
                max={20}
                value={novo.pessoas}
                onChange={mudarNovo('pessoas')}
                required
              />
            </div>
          )}

          {falha && <Alerta tipo="erro">{falha}</Alerta>}

          <div className="flex flex-wrap justify-end gap-2">
            <Botao variante="fantasma" onClick={aoFechar}>
              Cancelar
            </Botao>
            <Botao type="submit" icone={CalendarPlus} carregando={enviando}>
              Adicionar
            </Botao>
          </div>
        </form>
      )}
    </Modal>
  )
}
