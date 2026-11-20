import { Compass } from 'lucide-react'
import { LinkBotao } from '../components/ui.jsx'
import { useTitulo } from '../lib/hooks.js'

export default function NaoEncontrada() {
  useTitulo('Página não encontrada')
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-20 text-center sm:py-28">
      <span className="grid size-20 place-items-center rounded-3xl bg-coral-100 text-coral-700">
        <Compass aria-hidden="true" className="size-10" />
      </span>
      <p className="mt-8 font-display text-sm font-bold tracking-widest text-coral-700 uppercase">Erro 404</p>
      <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-petroleo-950 sm:text-5xl">
        Essa rota não está no mapa
      </h1>
      <p className="mt-4 max-w-md leading-relaxed text-tinta-suave">
        A página que você procurou não existe ou mudou de endereço. Que tal recomeçar a viagem pelo início?
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <LinkBotao to="/" tamanho="lg">
          Voltar ao início
        </LinkBotao>
        <LinkBotao to="/hospedagens" variante="contorno" tamanho="lg">
          Ver hospedagens
        </LinkBotao>
      </div>
    </div>
  )
}
