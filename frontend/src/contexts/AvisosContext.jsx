import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CircleAlert, CircleCheck, X } from 'lucide-react'
import { cx } from '../lib/formato.js'

const AvisosContext = createContext({ avisar: () => {} })

let sequencia = 0

const ESTILOS = {
  sucesso: { classe: 'border-emerald-700/25 bg-emerald-50 text-emerald-950', Icone: CircleCheck },
  aviso: { classe: 'border-amber-700/30 bg-amber-50 text-amber-950', Icone: CircleAlert },
  erro: { classe: 'border-red-700/30 bg-red-50 text-red-950', Icone: CircleAlert },
}

/** Avisos rápidos (toasts) de confirmação de ações. Ficam numa região aria-live. */
export function AvisosProvider({ children }) {
  const [avisos, setAvisos] = useState([])

  const fechar = useCallback((id) => {
    setAvisos((lista) => lista.filter((aviso) => aviso.id !== id))
  }, [])

  const avisar = useCallback(
    (mensagem, tipo = 'sucesso', acao = null) => {
      const id = ++sequencia
      setAvisos((lista) => [...lista.slice(-2), { id, mensagem, tipo, acao }])
      setTimeout(() => fechar(id), acao ? 9000 : 6000)
    },
    [fechar],
  )

  const valor = useMemo(() => ({ avisar }), [avisar])

  return (
    <AvisosContext.Provider value={valor}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-20 z-[70] flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6"
      >
        {avisos.map(({ id, mensagem, tipo, acao }) => {
          const { classe, Icone } = ESTILOS[tipo] ?? ESTILOS.sucesso
          return (
            <div
              key={id}
              className={cx(
                'pointer-events-auto flex w-full max-w-sm animate-surgir items-start gap-3 rounded-2xl border p-4 text-sm shadow-flutuante',
                classe,
              )}
            >
              <Icone aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{mensagem}</p>
                {acao && (
                  <Link to={acao.para} onClick={() => fechar(id)} className="mt-1 inline-block font-bold underline underline-offset-4">
                    {acao.rotulo}
                  </Link>
                )}
              </div>
              <button
                type="button"
                onClick={() => fechar(id)}
                className="-m-1 rounded-full p-1 hover:bg-black/10"
                aria-label="Fechar aviso"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>
          )
        })}
      </div>
    </AvisosContext.Provider>
  )
}

export const useAvisos = () => useContext(AvisosContext)
