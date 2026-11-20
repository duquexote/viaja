import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { auth } from '../api/index.js'
import { Alerta, Carregando, LinkBotao } from '../components/ui.jsx'
import { useTitulo } from '../lib/hooks.js'
import { MolduraDeAcesso } from './Entrar.jsx'

export default function ConfirmarEmail() {
  useTitulo('Confirmar e-mail')
  const [parametros] = useSearchParams()
  const token = parametros.get('token')
  const [estado, setEstado] = useState(token ? { fase: 'enviando' } : { fase: 'sem-token' })
  const jaEnviou = useRef(false)

  useEffect(() => {
    // O token vale uma vez: a guarda evita a segunda chamada do modo estrito do React em desenvolvimento.
    if (!token || jaEnviou.current) return
    jaEnviou.current = true
    auth
      .confirmar(token)
      .then((resposta) => setEstado({ fase: 'ok', mensagem: resposta?.mensagem }))
      .catch((erro) => setEstado({ fase: 'erro', mensagem: erro.message }))
  }, [token])

  return (
    <MolduraDeAcesso titulo="Confirmação de e-mail">
      {estado.fase === 'enviando' && <Carregando texto="Confirmando seu e-mail…" className="py-8" />}
      {estado.fase === 'ok' && (
        <div className="space-y-5">
          <Alerta tipo="sucesso" titulo="E-mail confirmado">
            {estado.mensagem ?? 'Sua conta está pronta para uso.'}
          </Alerta>
          <LinkBotao to="/entrar" state={{ confirmado: true }} tamanho="lg">
            Entrar na minha conta
          </LinkBotao>
        </div>
      )}
      {estado.fase === 'erro' && (
        <div className="space-y-5">
          <Alerta tipo="erro" titulo="Não foi possível confirmar">
            {estado.mensagem}
          </Alerta>
          <p className="text-sm text-tinta-suave">
            O link pode já ter sido usado. Se a conta já estiver confirmada, basta entrar.
          </p>
          <LinkBotao to="/entrar" variante="contorno">
            Ir para o login
          </LinkBotao>
        </div>
      )}
      {estado.fase === 'sem-token' && (
        <Alerta tipo="aviso" titulo="Link incompleto">
          Abra o link de confirmação exatamente como chegou no seu e-mail.
        </Alerta>
      )}
    </MolduraDeAcesso>
  )
}
