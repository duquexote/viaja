// Formatação em pt-BR e utilidades de data.
// As datas da API chegam como texto local ("AAAA-MM-DD" ou "AAAA-MM-DDTHH:mm:ss"), sem fuso.
// Por isso nunca usamos new Date("AAAA-MM-DD"), que interpretaria como UTC e mostraria o dia anterior.

const formatoMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const formatoExtenso = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })
const formatoLongo = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

const dois = (n) => String(n).padStart(2, '0')

export const cx = (...partes) => partes.filter(Boolean).join(' ')

export const moeda = (valor) => formatoMoeda.format(Number(valor ?? 0))

export const plural = (n, um, varios) => `${n} ${Number(n) === 1 ? um : varios}`

/** Converte o texto de data da API em Date no horário local. */
export function paraData(valor) {
  if (!valor) return null
  if (valor instanceof Date) return valor
  const [parteData, parteHora] = String(valor).split('T')
  const [ano, mes, dia] = parteData.split('-').map(Number)
  if (!ano || !mes || !dia) return null
  if (!parteHora) return new Date(ano, mes - 1, dia)
  const [h = 0, m = 0, s = 0] = parteHora.split(':').map((p) => Math.floor(Number(p)) || 0)
  return new Date(ano, mes - 1, dia, h, m, s)
}

export function isoData(date) {
  return `${date.getFullYear()}-${dois(date.getMonth() + 1)}-${dois(date.getDate())}`
}

export const hojeIso = () => isoData(new Date())

export function somarDias(iso, dias) {
  const d = paraData(iso)
  if (!d) return ''
  d.setDate(d.getDate() + dias)
  return isoData(d)
}

/** Dias corridos de `inicio` até `fim` (0 quando são o mesmo dia). */
export function diasEntre(inicio, fim) {
  const a = paraData(inicio)
  const b = paraData(fim)
  if (!a || !b) return 0
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.round((utcB - utcA) / 86400000)
}

export function fmtData(valor) {
  const d = paraData(valor)
  return d ? `${dois(d.getDate())}/${dois(d.getMonth() + 1)}/${d.getFullYear()}` : ''
}

export function fmtDataCurta(valor) {
  const d = paraData(valor)
  return d ? `${dois(d.getDate())}/${dois(d.getMonth() + 1)}` : ''
}

/** Ex.: "ter., 1 de dez." */
export function fmtDataExtenso(valor) {
  const d = paraData(valor)
  return d ? formatoExtenso.format(d) : ''
}

/** Ex.: "terça-feira, 1 de dezembro" */
export function fmtDataLonga(valor) {
  const d = paraData(valor)
  return d ? formatoLongo.format(d) : ''
}

/** Aceita "HH:mm", "HH:mm:ss" ou data e hora completas; devolve "HH:mm". */
export function fmtHora(valor) {
  if (!valor) return ''
  const texto = String(valor)
  const hora = texto.includes('T') ? texto.split('T')[1] : texto
  return hora.slice(0, 5)
}

export function fmtDataHora(valor) {
  return valor ? `${fmtData(valor)} às ${fmtHora(valor)}` : ''
}

export function fmtDuracao(minutos) {
  if (minutos == null) return ''
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  if (!h) return `${m} min`
  return m ? `${h}h${dois(m)}` : `${h}h`
}

export function fmtNota(valor) {
  return Number(valor ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

/** Ex.: "agora há pouco", "há 12 min", "há 3 h", "ontem" ou a data. */
export function fmtQuando(valor) {
  const d = paraData(valor)
  if (!d) return ''
  const minutos = Math.round((Date.now() - d.getTime()) / 60000)
  if (minutos < 1) return 'agora há pouco'
  if (minutos < 60) return `há ${minutos} min`
  const horas = Math.round(minutos / 60)
  if (horas < 24) return `há ${horas} h`
  if (horas < 48) return 'ontem'
  return fmtDataHora(valor)
}

/** Texto digitado em campo numérico -> número, ou undefined quando vazio ou inválido. */
export function numero(valor) {
  if (valor === '' || valor === null || valor === undefined) return undefined
  const n = Number(valor)
  return Number.isFinite(n) ? n : undefined
}
