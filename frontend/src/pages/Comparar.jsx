// Comparação lado a lado de 2 a 4 ofertas do mesmo tipo (RF-07, RN-10).
import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Scale, X } from 'lucide-react'
import { ofertas } from '../api/index.js'
import OfertaFoto from '../components/OfertaFoto.jsx'
import { Carregando, ErroAoCarregar, LinkBotao, NotaMedia, Pagina, Selo, Vazio } from '../components/ui.jsx'
import { useComparar } from '../contexts/CompararContext.jsx'
import { cx, fmtDataExtenso, fmtDuracao, fmtHora, moeda, plural } from '../lib/formato.js'
import { useDados } from '../lib/hooks.js'
import { diaSeguinte, rotuloHospedagem, rotuloTransporte, TIPOS_OFERTA, unidadeDoPreco } from '../lib/oferta.js'

/** Ids das ofertas que têm o melhor valor numa característica (vazio quando todas empatam). */
function vencedoras(lista, valorDe, melhor = Math.min) {
  const candidatas = lista.map((oferta) => ({ id: oferta.id, valor: valorDe(oferta) })).filter((c) => c.valor != null)
  if (candidatas.length < 2) return new Set()
  const alvo = melhor(...candidatas.map((c) => c.valor))
  const ganhadoras = candidatas.filter((c) => c.valor === alvo)
  return ganhadoras.length === candidatas.length ? new Set() : new Set(ganhadoras.map((c) => c.id))
}

function montarLinhas(lista) {
  const tipo = lista[0].tipo
  const maisBaratas = vencedoras(lista, (o) => Number(o.preco))
  const maisBemAvaliadas = vencedoras(lista, (o) => (o.totalAvaliacoes > 0 ? Number(o.notaMedia) : null), Math.max)

  const linhas = [
    {
      rotulo: 'Preço',
      destaque: maisBaratas,
      selo: 'Menor preço',
      celula: (o) => (
        <>
          <span className="block font-display text-xl font-extrabold text-petroleo-950">{moeda(o.preco)}</span>
          <span className="block text-xs text-tinta-suave">{unidadeDoPreco(o)}</span>
        </>
      ),
    },
    {
      rotulo: 'Avaliação',
      destaque: maisBemAvaliadas,
      selo: 'Melhor nota',
      celula: (o) => <NotaMedia nota={o.notaMedia} total={o.totalAvaliacoes} />,
    },
  ]

  if (tipo === 'PASSAGEM') {
    const maisRapidas = vencedoras(lista, (o) => o.duracaoMinutos)
    linhas.push(
      { rotulo: 'Trecho', celula: (o) => `${o.origem} → ${o.destino}` },
      { rotulo: 'Transporte', celula: (o) => rotuloTransporte(o.tipoTransporte) },
      { rotulo: 'Data', celula: (o) => fmtDataExtenso(o.partida) },
      { rotulo: 'Partida', celula: (o) => fmtHora(o.partida) },
      {
        rotulo: 'Chegada',
        celula: (o) => `${fmtHora(o.chegada)}${diaSeguinte(o) ? ` (${diaSeguinte(o)} dia)` : ''}`,
      },
      { rotulo: 'Duração', destaque: maisRapidas, selo: 'Mais rápida', celula: (o) => fmtDuracao(o.duracaoMinutos) },
      { rotulo: 'Assentos livres', celula: (o) => o.vagas },
    )
  } else if (tipo === 'HOSPEDAGEM') {
    linhas.push(
      { rotulo: 'Cidade', celula: (o) => o.cidade },
      { rotulo: 'Tipo', celula: (o) => rotuloHospedagem(o.tipoHospedagem) },
      { rotulo: 'Capacidade', celula: (o) => `${plural(o.capacidade ?? 1, 'hóspede', 'hóspedes')} por quarto` },
      { rotulo: 'Quartos livres', celula: (o) => o.vagas },
      {
        rotulo: 'Comodidades',
        celula: (o) =>
          o.comodidades?.length ? (
            <ul className="space-y-1">
              {o.comodidades.map((comodidade) => (
                <li key={comodidade}>{comodidade}</li>
              ))}
            </ul>
          ) : (
            'Não informadas'
          ),
      },
    )
  } else {
    linhas.push(
      { rotulo: 'Cidade', celula: (o) => o.cidade },
      { rotulo: 'Categoria', celula: (o) => o.categoria },
      { rotulo: 'Data', celula: (o) => fmtDataExtenso(o.data) },
      { rotulo: 'Início', celula: (o) => fmtHora(o.horarioInicio) },
      { rotulo: 'Duração', celula: (o) => `${o.duracaoHoras} h` },
      { rotulo: 'Vagas', celula: (o) => o.vagas },
    )
  }

  linhas.push({ rotulo: 'Fornecedor', celula: (o) => o.fornecedorNome })
  return linhas
}

function Tabela({ lista, aoRemover }) {
  const linhas = montarLinhas(lista)
  return (
    <div className="cartao overflow-x-auto" tabIndex={0} role="region" aria-label="Tabela de comparação (role para os lados se necessário)">
      <table className="w-full table-fixed border-collapse text-left text-sm" style={{ minWidth: `${9 + lista.length * 13}rem` }}>
        <colgroup>
          <col style={{ width: '9rem' }} />
          {lista.map((oferta) => (
            <col key={oferta.id} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th scope="col" className="sticky left-0 z-10 bg-white p-4 align-bottom text-xs font-bold tracking-wider text-tinta-suave uppercase">
              Característica
            </th>
            {lista.map((oferta) => (
              <th key={oferta.id} scope="col" className="p-4 align-top font-normal">
                <OfertaFoto oferta={oferta} className="h-24 w-full rounded-2xl" />
                <div className="mt-3 flex items-start justify-between gap-2">
                  <Link to={`/ofertas/${oferta.id}`} className="font-display text-base leading-snug font-bold text-petroleo-950 hover:underline">
                    {oferta.titulo}
                  </Link>
                  <button
                    type="button"
                    onClick={() => aoRemover(oferta.id)}
                    aria-label={`Tirar ${oferta.titulo} da comparação`}
                    className="-m-1 shrink-0 rounded-full p-1 text-tinta-suave hover:bg-petroleo-900/10 hover:text-petroleo-950"
                  >
                    <X aria-hidden="true" className="size-4" />
                  </button>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha) => (
            <tr key={linha.rotulo} className="border-t border-petroleo-900/10">
              <th scope="row" className="sticky left-0 z-10 bg-white p-4 align-top font-semibold text-petroleo-900">
                {linha.rotulo}
              </th>
              {lista.map((oferta) => {
                const venceu = linha.destaque?.has(oferta.id)
                return (
                  <td key={oferta.id} className={cx('p-4 align-top text-tinta', venceu && 'bg-emerald-50')}>
                    {linha.celula(oferta)}
                    {venceu && (
                      <div className="mt-2">
                        <Selo className="bg-emerald-700 text-white">{linha.selo}</Selo>
                      </div>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
          <tr className="border-t border-petroleo-900/10">
            <th scope="row" className="sticky left-0 z-10 bg-white p-4">
              <span className="sr-only">Ações</span>
            </th>
            {lista.map((oferta) => (
              <td key={oferta.id} className="p-4">
                <LinkBotao to={`/ofertas/${oferta.id}`} tamanho="sm" aria-label={`Ver detalhes de ${oferta.titulo}`}>
                  Ver detalhes
                </LinkBotao>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

export default function Comparar() {
  const [parametros, setParametros] = useSearchParams()
  const selecao = useComparar()
  const bruto = parametros.get('ids') ?? ''
  const ids = useMemo(
    () => [...new Set(bruto.split(',').map((parte) => parte.trim()).filter((parte) => /^\d+$/.test(parte)))],
    [bruto],
  )
  const consulta = useDados(() => ofertas.comparar(ids), [ids.join(',')], ids.length >= 2)
  const lista = consulta.dados ?? []
  const tipo = lista[0]?.tipo

  function remover(id) {
    selecao.remover(id)
    setParametros({ ids: ids.filter((item) => item !== String(id)).join(',') }, { replace: true })
  }

  return (
    <Pagina
      titulo="Comparar ofertas"
      descricao="Veja lado a lado até 4 ofertas do mesmo tipo. Os melhores valores de cada linha ficam em destaque."
      acoes={
        tipo && (
          <LinkBotao to={TIPOS_OFERTA[tipo].rota} variante="contorno">
            Voltar para {TIPOS_OFERTA[tipo].plural.toLowerCase()}
          </LinkBotao>
        )
      }
    >
      {ids.length < 2 ? (
        <Vazio
          icone={Scale}
          titulo="Escolha de 2 a 4 ofertas para comparar"
          acao={
            <>
              <LinkBotao to="/passagens">Passagens</LinkBotao>
              <LinkBotao to="/hospedagens" variante="contorno">
                Hospedagens
              </LinkBotao>
              <LinkBotao to="/passeios" variante="contorno">
                Passeios
              </LinkBotao>
            </>
          }
        >
          Nas telas de busca, use o botão Comparar nos cartões. As ofertas precisam ser do mesmo tipo.
        </Vazio>
      ) : consulta.carregando ? (
        <Carregando texto="Montando a comparação…" />
      ) : consulta.erro ? (
        <ErroAoCarregar mensagem={consulta.erro} aoTentar={consulta.recarregar} />
      ) : (
        <Tabela lista={lista} aoRemover={remover} />
      )}
    </Pagina>
  )
}
