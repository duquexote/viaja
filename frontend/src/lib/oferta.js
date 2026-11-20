// Rótulos e regras de exibição das ofertas, reservas e perfis.
import { BedDouble, Bus, Compass, Landmark, Moon, Mountain, Plane, TreePalm, Utensils } from 'lucide-react'
import { diasEntre, fmtDataCurta, fmtHora, plural } from './formato.js'

export const TIPOS_OFERTA = {
  PASSAGEM: { rotulo: 'Passagem', plural: 'Passagens', rota: '/passagens' },
  HOSPEDAGEM: { rotulo: 'Hospedagem', plural: 'Hospedagens', rota: '/hospedagens' },
  PASSEIO: { rotulo: 'Passeio', plural: 'Passeios', rota: '/passeios' },
}

export const TRANSPORTES = { AEREA: 'Aéreo', RODOVIARIA: 'Rodoviário' }

export const HOSPEDAGENS = { HOTEL: 'Hotel', POUSADA: 'Pousada', HOSTEL: 'Hostel', CASA: 'Casa' }

export const PERFIS = { VIAJANTE: 'Viajante', FORNECEDOR: 'Fornecedor', ADMINISTRADOR: 'Administrador' }

export const STATUS_RESERVA = {
  SOLICITADA: { rotulo: 'Aguardando resposta', classe: 'bg-amber-100 text-amber-900' },
  CONFIRMADA: { rotulo: 'Confirmada', classe: 'bg-emerald-100 text-emerald-900' },
  RECUSADA: { rotulo: 'Recusada', classe: 'bg-red-100 text-red-900' },
  EXPIRADA: { rotulo: 'Expirada', classe: 'bg-slate-200 text-slate-800' },
  CANCELADA: { rotulo: 'Cancelada', classe: 'bg-slate-200 text-slate-800' },
}

export const rotuloTransporte = (valor) => TRANSPORTES[valor] ?? valor ?? ''
export const rotuloHospedagem = (valor) => HOSPEDAGENS[valor] ?? valor ?? ''

export function iconeDaOferta(oferta) {
  if (oferta.tipo === 'PASSAGEM') return oferta.tipoTransporte === 'AEREA' ? Plane : Bus
  if (oferta.tipo === 'HOSPEDAGEM') return BedDouble
  const categoria = (oferta.categoria ?? '').toLowerCase()
  if (categoria.includes('praia')) return TreePalm
  if (categoria.includes('gastr')) return Utensils
  if (categoria.includes('cult')) return Landmark
  if (categoria.includes('noturn')) return Moon
  if (categoria.includes('avent')) return Compass
  return Mountain
}

export const unidadeDoPreco = (oferta) => (oferta.tipo === 'HOSPEDAGEM' ? 'por noite, por quarto' : 'por pessoa')

/** Quartos necessários para acomodar `pessoas` numa hospedagem. */
export function quartosNecessarios(oferta, pessoas) {
  const capacidade = Math.max(1, Number(oferta.capacidade) || 1)
  return Math.max(1, Math.ceil((Number(pessoas) || 1) / capacidade))
}

/** Mesmo cálculo do back-end: passagem e passeio = preço x pessoas; hospedagem = diária x noites x quartos. */
export function custoEstimado(oferta, { pessoas = 1, noites = 1 } = {}) {
  const preco = Number(oferta.preco) || 0
  const qtdPessoas = Math.max(1, Number(pessoas) || 1)
  if (oferta.tipo !== 'HOSPEDAGEM') return preco * qtdPessoas
  return preco * Math.max(1, Number(noites) || 1) * quartosNecessarios(oferta, qtdPessoas)
}

/** A chegada cai em dia diferente da partida? Devolve "+1", "+2"... ou "". */
export function diaSeguinte(oferta) {
  const dias = diasEntre(oferta.partida, oferta.chegada)
  return dias > 0 ? `+${dias}` : ''
}

/** Linha curta que resume a oferta em listas compactas (itinerário, reservas, roteiro). */
export function resumoDaOferta(oferta) {
  if (oferta.tipo === 'PASSAGEM') {
    const extra = diaSeguinte(oferta)
    return `${rotuloTransporte(oferta.tipoTransporte)} · ${fmtDataCurta(oferta.partida)}, ${fmtHora(oferta.partida)} → ${fmtHora(oferta.chegada)}${extra ? ` (${extra})` : ''}`
  }
  if (oferta.tipo === 'HOSPEDAGEM') {
    return `${rotuloHospedagem(oferta.tipoHospedagem)} em ${oferta.cidade} · até ${plural(oferta.capacidade ?? 1, 'hóspede', 'hóspedes')} por quarto`
  }
  return `${oferta.categoria} em ${oferta.cidade} · ${fmtDataCurta(oferta.data)} às ${fmtHora(oferta.horarioInicio)} · ${oferta.duracaoHoras} h`
}

/** Data mais natural para começar um itinerário a partir desta oferta. */
export function dataDeReferencia(oferta) {
  if (oferta.tipo === 'PASSAGEM' && oferta.partida) return String(oferta.partida).split('T')[0]
  if (oferta.tipo === 'PASSEIO' && oferta.data) return oferta.data
  return null
}
