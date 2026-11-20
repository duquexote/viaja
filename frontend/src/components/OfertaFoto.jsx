import { useState } from 'react'
import { cx } from '../lib/formato.js'
import { iconeDaOferta } from '../lib/oferta.js'

const TEMAS = {
  PASSAGEM: 'from-petroleo-900 via-petroleo-600 to-petroleo-300',
  HOSPEDAGEM: 'from-coral-700 via-coral-400 to-sol-300',
  PASSEIO: 'from-emerald-900 via-teal-600 to-lime-300',
}

/**
 * Foto da oferta. Quando o fornecedor não cadastrou imagem (ou ela falha ao carregar),
 * desenha uma ilustração em CSS com as cores do tipo de oferta, sem depender de rede.
 */
export default function OfertaFoto({ oferta, className }) {
  const [falhou, setFalhou] = useState(false)

  if (oferta.fotoUrl && !falhou) {
    return (
      <img
        src={oferta.fotoUrl}
        alt={`Foto de ${oferta.titulo}`}
        loading="lazy"
        onError={() => setFalhou(true)}
        className={cx('object-cover', className)}
      />
    )
  }

  const Icone = iconeDaOferta(oferta)

  return (
    <div
      aria-hidden="true"
      className={cx('relative isolate overflow-hidden bg-linear-to-br', TEMAS[oferta.tipo] ?? TEMAS.PASSAGEM, className)}
    >
      <span className="absolute -top-10 -right-8 size-36 rounded-full bg-white/12" />
      <span className="absolute top-5 right-5 size-12 rounded-full bg-sol-300/90 shadow-[0_0_40px_10px] shadow-sol-300/40" />
      <svg viewBox="0 0 400 120" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-2/5 w-full">
        <path d="M0 50c60-30 120-30 200 0s140 30 200 0v70H0Z" className="fill-white/15" />
        <path d="M0 78c70-24 130-24 200 0s130 24 200 0v42H0Z" className="fill-white/15" />
      </svg>
      <span className="absolute bottom-4 left-4 grid size-12 place-items-center rounded-2xl bg-white/25 text-white ring-1 ring-white/40 backdrop-blur-sm">
        <Icone className="size-6" />
      </span>
    </div>
  )
}
