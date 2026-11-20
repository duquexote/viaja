import { cx } from '../lib/formato.js'

/** Logotipo do ViaJá: sol de fim de tarde sobre o mar + nome. */
export default function Marca({ clara = false, className }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-2 font-display text-2xl leading-none font-extrabold tracking-tight',
        clara ? 'text-white' : 'text-petroleo-900',
        className,
      )}
    >
      <svg viewBox="0 0 32 32" aria-hidden="true" className="size-8 shrink-0">
        <rect width="32" height="32" rx="10" className={clara ? 'fill-white/15' : 'fill-petroleo-800'} />
        <circle cx="21.5" cy="11.5" r="5" className="fill-coral-400" />
        <path
          d="M5.500 21.500c2.300-2 4.700-2 7 0s4.700 2 7 0 4.700-2 7 0"
          fill="none"
          strokeWidth="2.800"
          strokeLinecap="round"
          className="stroke-areia-100"
        />
      </svg>
      <span>
        Via<span className={clara ? 'text-coral-400' : 'text-coral-600'}>Já</span>
      </span>
    </span>
  )
}
