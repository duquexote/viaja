// Edição de perfil e exclusão da própria conta (RF-02, RNF-04).
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound, Save, ShieldAlert, Trash2 } from 'lucide-react'
import { usuarios } from '../api/index.js'
import { Alerta, Botao, Chips, Entrada, Modal, Pagina, Selo } from '../components/ui.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useAvisos } from '../contexts/AvisosContext.jsx'
import { useOpcoes } from '../lib/hooks.js'
import { PERFIS } from '../lib/oferta.js'

const PALAVRA_DE_CONFIRMACAO = 'EXCLUIR'

function DadosPessoais({ usuario }) {
  const { atualizarUsuario } = useAuth()
  const { avisar } = useAvisos()
  const opcoes = useOpcoes()
  const viajante = usuario.perfil === 'VIAJANTE'
  const fornecedor = usuario.perfil === 'FORNECEDOR'
  const [f, setF] = useState({
    nome: usuario.nome ?? '',
    dataNascimento: usuario.dataNascimento ?? '',
    interesses: usuario.interesses ?? [],
    razaoSocial: usuario.razaoSocial ?? '',
    cnpj: usuario.cnpj ?? '',
  })
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState(null)
  const [campos, setCampos] = useState({})
  const mudar = (campo) => (evento) => setF((atual) => ({ ...atual, [campo]: evento.target.value }))

  async function salvar(evento) {
    evento.preventDefault()
    setEnviando(true)
    setErro(null)
    setCampos({})
    try {
      const atualizado = await usuarios.atualizar({
        nome: f.nome.trim(),
        dataNascimento: f.dataNascimento,
        ...(viajante ? { interesses: f.interesses } : {}),
        ...(fornecedor ? { razaoSocial: f.razaoSocial.trim(), cnpj: f.cnpj.trim() || null } : {}),
      })
      atualizarUsuario(atualizado)
      avisar('Perfil atualizado.')
    } catch (falha) {
      setErro(falha.message)
      setCampos(falha.campos ?? {})
    } finally {
      setEnviando(false)
    }
  }

  // Os interesses salvos aparecem mesmo que a lista de sugestões ainda não tenha chegado.
  const interesses = [...new Set([...opcoes.interesses, ...f.interesses])]

  return (
    <form onSubmit={salvar} className="cartao space-y-5 p-5 sm:p-7">
      <h2 className="font-display text-xl font-bold text-petroleo-950">Dados da conta</h2>
      <Entrada rotulo="E-mail" type="email" value={usuario.email ?? ''} disabled dica="O e-mail identifica a conta e não pode ser alterado." />
      <div className="grid gap-5 sm:grid-cols-2">
        <Entrada
          rotulo={fornecedor ? 'Nome do responsável' : 'Nome completo'}
          autoComplete="name"
          value={f.nome}
          onChange={mudar('nome')}
          erro={campos.nome}
          required
        />
        <Entrada
          rotulo="Data de nascimento"
          type="date"
          autoComplete="bday"
          value={f.dataNascimento}
          onChange={mudar('dataNascimento')}
          erro={campos.dataNascimento}
          required
        />
      </div>
      {fornecedor && (
        <div className="grid gap-5 sm:grid-cols-2">
          <Entrada
            rotulo="Razão social ou nome do negócio"
            value={f.razaoSocial}
            onChange={mudar('razaoSocial')}
            erro={campos.razaoSocial}
            required
          />
          <Entrada rotulo="CNPJ" inputMode="numeric" value={f.cnpj} onChange={mudar('cnpj')} erro={campos.cnpj} />
        </div>
      )}
      {viajante && interesses.length > 0 && (
        <Chips
          legenda="Meus interesses de viagem"
          opcoes={interesses}
          selecionados={f.interesses}
          aoAlternar={(interesse) =>
            setF((atual) => ({
              ...atual,
              interesses: atual.interesses.includes(interesse)
                ? atual.interesses.filter((item) => item !== interesse)
                : [...atual.interesses, interesse],
            }))
          }
          dica="Usamos para sugerir passeios que combinam com você."
        />
      )}
      {erro && <Alerta tipo="erro">{erro}</Alerta>}
      <Botao type="submit" icone={Save} carregando={enviando}>
        Salvar alterações
      </Botao>
    </form>
  )
}

function TrocarSenha({ usuario }) {
  const { avisar } = useAvisos()
  const [f, setF] = useState({ senhaAtual: '', novaSenha: '', confirmacao: '' })
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState(null)
  const [campos, setCampos] = useState({})
  const mudar = (campo) => (evento) => setF((atual) => ({ ...atual, [campo]: evento.target.value }))

  async function salvar(evento) {
    evento.preventDefault()
    setErro(null)
    setCampos({})
    if (f.novaSenha !== f.confirmacao) {
      setCampos({ confirmacao: 'As senhas não são iguais.' })
      return
    }
    setEnviando(true)
    try {
      await usuarios.atualizar({
        nome: usuario.nome,
        dataNascimento: usuario.dataNascimento,
        senhaAtual: f.senhaAtual,
        novaSenha: f.novaSenha,
      })
      setF({ senhaAtual: '', novaSenha: '', confirmacao: '' })
      avisar('Senha alterada.')
    } catch (falha) {
      setErro(falha.message)
      setCampos(falha.campos ?? {})
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={salvar} className="cartao space-y-5 p-5 sm:p-7">
      <h2 className="font-display text-xl font-bold text-petroleo-950">Trocar senha</h2>
      {/* Campo oculto para os gerenciadores de senha associarem a troca à conta certa. */}
      <input type="email" autoComplete="username" value={usuario.email ?? ''} readOnly hidden />
      <Entrada
        rotulo="Senha atual"
        type="password"
        autoComplete="current-password"
        value={f.senhaAtual}
        onChange={mudar('senhaAtual')}
        erro={campos.senhaAtual}
        required
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <Entrada
          rotulo="Nova senha"
          type="password"
          autoComplete="new-password"
          minLength={6}
          value={f.novaSenha}
          onChange={mudar('novaSenha')}
          erro={campos.novaSenha}
          dica="No mínimo 6 caracteres."
          required
        />
        <Entrada
          rotulo="Repita a nova senha"
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
      <Botao type="submit" variante="contorno" icone={KeyRound} carregando={enviando}>
        Alterar senha
      </Botao>
    </form>
  )
}

function ExcluirConta() {
  const { sair } = useAuth()
  const { avisar } = useAvisos()
  const navigate = useNavigate()
  const [aberto, setAberto] = useState(false)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState(null)

  async function excluir(evento) {
    evento.preventDefault()
    setEnviando(true)
    setErro(null)
    try {
      await usuarios.excluir()
      sair()
      avisar('Sua conta foi excluída e seus dados pessoais foram removidos.')
      navigate('/', { replace: true })
    } catch (falha) {
      setErro(falha.message)
      setEnviando(false)
    }
  }

  return (
    <section className="rounded-3xl border border-red-700/30 bg-red-50/60 p-5 sm:p-7" aria-labelledby="titulo-excluir">
      <h2 id="titulo-excluir" className="flex items-center gap-2 font-display text-xl font-bold text-red-900">
        <ShieldAlert aria-hidden="true" className="size-5" />
        Excluir minha conta
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-tinta">
        Seus dados pessoais são removidos, os itinerários são apagados e as solicitações pendentes são canceladas. Essa
        ação não pode ser desfeita.
      </p>
      <Botao variante="perigo-contorno" icone={Trash2} className="mt-4" onClick={() => setAberto(true)}>
        Excluir conta
      </Botao>

      {aberto && (
        <Modal
          aberto
          titulo="Excluir conta definitivamente?"
          largura="max-w-md"
          aoFechar={() => {
            setAberto(false)
            setTexto('')
            setErro(null)
          }}
        >
          <form onSubmit={excluir} className="space-y-5">
            <Alerta tipo="erro" titulo="Ação permanente">
              Você perde o acesso na hora e não é possível recuperar a conta depois.
            </Alerta>
            <Entrada
              rotulo={`Digite ${PALAVRA_DE_CONFIRMACAO} para confirmar`}
              value={texto}
              onChange={(evento) => setTexto(evento.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              required
            />
            {erro && <Alerta tipo="erro">{erro}</Alerta>}
            <div className="flex flex-wrap justify-end gap-2">
              <Botao variante="fantasma" onClick={() => setAberto(false)}>
                Manter minha conta
              </Botao>
              <Botao
                type="submit"
                variante="perigo"
                icone={Trash2}
                carregando={enviando}
                disabled={texto.trim().toUpperCase() !== PALAVRA_DE_CONFIRMACAO}
              >
                Excluir conta
              </Botao>
            </div>
          </form>
        </Modal>
      )}
    </section>
  )
}

export default function Perfil() {
  const { usuario } = useAuth()

  return (
    <Pagina
      titulo="Meu perfil"
      largura="max-w-3xl"
      sobretitulo={
        <span className="flex flex-wrap items-center gap-2">
          <Selo>{PERFIS[usuario.perfil] ?? usuario.perfil}</Selo>
          {usuario.perfil === 'FORNECEDOR' &&
            (usuario.bloqueado ? (
              <Selo className="bg-red-100 text-red-900">Cadastro bloqueado</Selo>
            ) : usuario.aprovado ? (
              <Selo className="bg-emerald-100 text-emerald-900">Aprovado para publicar</Selo>
            ) : (
              <Selo className="bg-amber-100 text-amber-900">Aguardando aprovação</Selo>
            ))}
        </span>
      }
      descricao="Mantenha seus dados em dia. Coletamos só o necessário para a conta funcionar."
    >
      <div className="space-y-6">
        <DadosPessoais key={usuario.id} usuario={usuario} />
        <TrocarSenha usuario={usuario} />
        <ExcluirConta />
      </div>
    </Pagina>
  )
}
