import { useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { Backpack, MailCheck, Store, UserPlus } from 'lucide-react'
import { auth } from '../api/index.js'
import { Alerta, Botao, Entrada, LinkBotao } from '../components/ui.jsx'
import { inicioDoPerfil, useAuth } from '../contexts/AuthContext.jsx'
import { cx, isoData } from '../lib/formato.js'
import { useTitulo } from '../lib/hooks.js'
import { MolduraDeAcesso } from './Entrar.jsx'

const PERFIS = [
  { id: 'VIAJANTE', titulo: 'Sou viajante', texto: 'Quero pesquisar, montar roteiros e reservar.', icone: Backpack },
  { id: 'FORNECEDOR', titulo: 'Sou fornecedor', texto: 'Quero divulgar passagens, hospedagens ou passeios.', icone: Store },
]

function dataLimiteDeNascimento() {
  const hoje = new Date()
  return isoData(new Date(hoje.getFullYear() - 18, hoje.getMonth(), hoje.getDate()))
}

export default function Cadastro() {
  useTitulo('Criar conta')
  const { usuario } = useAuth()
  const [parametros] = useSearchParams()
  const [f, setF] = useState({
    perfil: parametros.get('perfil') === 'FORNECEDOR' ? 'FORNECEDOR' : 'VIAJANTE',
    nome: '',
    email: '',
    dataNascimento: '',
    senha: '',
    confirmacao: '',
    razaoSocial: '',
    cnpj: '',
  })
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState(null)
  const [campos, setCampos] = useState({})
  const [resultado, setResultado] = useState(null)

  if (usuario) return <Navigate to={inicioDoPerfil(usuario.perfil)} replace />

  const mudar = (campo) => (evento) => setF((atual) => ({ ...atual, [campo]: evento.target.value }))
  const fornecedor = f.perfil === 'FORNECEDOR'

  async function enviar(evento) {
    evento.preventDefault()
    setErro(null)
    setCampos({})
    if (f.senha !== f.confirmacao) {
      setCampos({ confirmacao: 'As senhas não são iguais.' })
      return
    }
    setEnviando(true)
    try {
      const resposta = await auth.registrar({
        nome: f.nome.trim(),
        email: f.email.trim(),
        senha: f.senha,
        dataNascimento: f.dataNascimento,
        perfil: f.perfil,
        razaoSocial: fornecedor ? f.razaoSocial.trim() : null,
        cnpj: fornecedor && f.cnpj.trim() ? f.cnpj.trim() : null,
      })
      setResultado(resposta ?? {})
    } catch (falha) {
      setErro(falha.message)
      setCampos(falha.campos ?? {})
    } finally {
      setEnviando(false)
    }
  }

  if (resultado) {
    return (
      <MolduraDeAcesso titulo="Falta só confirmar o e-mail">
        <div className="space-y-5">
          <Alerta tipo="sucesso" titulo="Conta criada">
            {resultado.mensagem ?? `Enviamos um link de confirmação para ${f.email}.`}
          </Alerta>
          {fornecedor && (
            <Alerta tipo="info">
              Depois de confirmar o e-mail, seu cadastro de fornecedor passa pela aprovação do administrador antes de
              você publicar ofertas.
            </Alerta>
          )}
          {resultado.linkConfirmacaoDemo ? (
            <div className="rounded-2xl border border-dashed border-petroleo-900/30 bg-areia-100 p-5">
              <p className="text-sm leading-relaxed text-tinta">
                <strong>Modo demonstração:</strong> o envio de e-mail não está configurado neste ambiente. Use o botão
                abaixo no lugar do link que chegaria na sua caixa de entrada.
              </p>
              <LinkBotao to={resultado.linkConfirmacaoDemo} variante="acento" icone={MailCheck} className="mt-4">
                Confirmar e-mail (modo demonstração)
              </LinkBotao>
            </div>
          ) : (
            <p className="text-sm text-tinta-suave">
              Abra o e-mail e clique no link de confirmação. Depois volte e{' '}
              <Link to="/entrar" className="elo">
                entre na sua conta
              </Link>
              .
            </p>
          )}
        </div>
      </MolduraDeAcesso>
    )
  }

  return (
    <MolduraDeAcesso
      titulo="Criar conta"
      subtitulo="Leva um minuto. Pedimos só os dados necessários para a sua conta."
      rodape={
        <p>
          Já tem conta?{' '}
          <Link to="/entrar" className="elo">
            Entrar
          </Link>
        </p>
      }
    >
      <form onSubmit={enviar} className="space-y-5">
        <fieldset>
          <legend className="rotulo">Como você vai usar o ViaJá?</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {PERFIS.map(({ id, titulo, texto, icone: Icone }) => {
              const marcado = f.perfil === id
              return (
                <label
                  key={id}
                  className={cx(
                    'flex cursor-pointer gap-3 rounded-2xl border p-4 has-focus-visible:outline-3 has-focus-visible:outline-coral-500',
                    marcado ? 'border-petroleo-700 bg-petroleo-50' : 'border-petroleo-900/20 hover:border-petroleo-900/45',
                  )}
                >
                  <input
                    type="radio"
                    name="perfil"
                    value={id}
                    checked={marcado}
                    onChange={mudar('perfil')}
                    className="sr-only"
                  />
                  <span
                    className={cx(
                      'grid size-10 shrink-0 place-items-center rounded-xl',
                      marcado ? 'bg-petroleo-800 text-sol-300' : 'bg-areia-100 text-petroleo-800',
                    )}
                  >
                    <Icone aria-hidden="true" className="size-5" />
                  </span>
                  <span>
                    <span className="block font-bold text-petroleo-950">{titulo}</span>
                    <span className="block text-sm text-tinta-suave">{texto}</span>
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>

        <Entrada
          rotulo={fornecedor ? 'Nome do responsável' : 'Nome completo'}
          autoComplete="name"
          value={f.nome}
          onChange={mudar('nome')}
          erro={campos.nome}
          required
        />
        {fornecedor && (
          <div className="grid gap-5 sm:grid-cols-2">
            <Entrada
              rotulo="Razão social ou nome do negócio"
              autoComplete="organization"
              value={f.razaoSocial}
              onChange={mudar('razaoSocial')}
              erro={campos.razaoSocial}
              required
            />
            <Entrada
              rotulo="CNPJ"
              inputMode="numeric"
              placeholder="00.000.000/0000-00"
              value={f.cnpj}
              onChange={mudar('cnpj')}
              erro={campos.cnpj}
              dica="Opcional para guias e pequenos negócios."
            />
          </div>
        )}
        <div className="grid gap-5 sm:grid-cols-2">
          <Entrada
            rotulo="E-mail"
            type="email"
            autoComplete="email"
            value={f.email}
            onChange={mudar('email')}
            erro={campos.email}
            required
          />
          <Entrada
            rotulo="Data de nascimento"
            type="date"
            autoComplete="bday"
            max={dataLimiteDeNascimento()}
            value={f.dataNascimento}
            onChange={mudar('dataNascimento')}
            erro={campos.dataNascimento}
            dica="É preciso ter 18 anos ou mais."
            required
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Entrada
            rotulo="Senha"
            type="password"
            autoComplete="new-password"
            minLength={6}
            value={f.senha}
            onChange={mudar('senha')}
            erro={campos.senha}
            dica="No mínimo 6 caracteres."
            required
          />
          <Entrada
            rotulo="Repita a senha"
            type="password"
            autoComplete="new-password"
            minLength={6}
            value={f.confirmacao}
            onChange={mudar('confirmacao')}
            erro={campos.confirmacao}
            required
          />
        </div>

        {erro && <Alerta tipo="erro">{erro}</Alerta>}

        <Botao type="submit" tamanho="lg" icone={UserPlus} carregando={enviando} className="w-full">
          Criar conta
        </Botao>
      </form>
    </MolduraDeAcesso>
  )
}
