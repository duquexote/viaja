// Uma função por rota do contrato (docs/API.md), agrupadas por área.
import { api } from './client.js'

const post = (caminho, corpo) => api(caminho, { metodo: 'POST', corpo })
const put = (caminho, corpo) => api(caminho, { metodo: 'PUT', corpo })
const excluir = (caminho) => api(caminho, { metodo: 'DELETE' })

export const auth = {
  registrar: (dados) => post('/auth/registrar', dados),
  confirmar: (token) => api('/auth/confirmar', { params: { token } }),
  login: (credenciais) => post('/auth/login', credenciais),
}

export const ofertas = {
  opcoes: () => api('/ofertas/opcoes'),
  passagens: (params) => api('/ofertas/passagens', { params }),
  hospedagens: (params) => api('/ofertas/hospedagens', { params }),
  passeios: (params) => api('/ofertas/passeios', { params }),
  comparar: (ids) => api('/ofertas/comparar', { params: { ids: ids.join(',') } }),
  obter: (id) => api(`/ofertas/${id}`),
  avaliacoes: (id) => api(`/ofertas/${id}/avaliacoes`),
}

export const usuarios = {
  eu: () => api('/usuarios/eu'),
  atualizar: (dados) => put('/usuarios/eu', dados),
  excluir: () => excluir('/usuarios/eu'),
}

export const notificacoes = {
  listar: () => api('/notificacoes'),
  naoLidas: () => api('/notificacoes/nao-lidas'),
  marcarLida: (id) => post(`/notificacoes/${id}/lida`),
  marcarTodas: () => post('/notificacoes/lidas'),
}

export const itinerarios = {
  listar: () => api('/itinerarios'),
  criar: (dados) => post('/itinerarios', dados),
  obter: (id) => api(`/itinerarios/${id}`),
  atualizar: (id, dados) => put(`/itinerarios/${id}`, dados),
  excluir: (id) => excluir(`/itinerarios/${id}`),
  adicionarItem: (id, item) => post(`/itinerarios/${id}/itens`, item),
  atualizarItem: (id, itemId, item) => put(`/itinerarios/${id}/itens/${itemId}`, item),
  removerItem: (id, itemId) => excluir(`/itinerarios/${id}/itens/${itemId}`),
  solicitar: (id) => post(`/itinerarios/${id}/solicitar`),
}

export const reservas = {
  listar: () => api('/reservas'),
  criar: (dados) => post('/reservas', dados),
  cancelar: (id) => post(`/reservas/${id}/cancelar`),
  avaliar: (id, avaliacao) => post(`/reservas/${id}/avaliacao`, avaliacao),
}

export const assistente = {
  uso: () => api('/assistente/uso'),
  roteiro: (pedido) => post('/assistente/roteiro', pedido),
}

export const fornecedor = {
  ofertas: () => api('/fornecedor/ofertas'),
  criarOferta: (oferta) => post('/fornecedor/ofertas', oferta),
  atualizarOferta: (id, oferta) => put(`/fornecedor/ofertas/${id}`, oferta),
  definirAtiva: (id, ativa) => api(`/fornecedor/ofertas/${id}/ativa`, { metodo: 'PATCH', corpo: { ativa } }),
  reservas: (status) => api('/fornecedor/reservas', { params: { status } }),
  aceitar: (id) => post(`/fornecedor/reservas/${id}/aceitar`),
  recusar: (id, motivo) => post(`/fornecedor/reservas/${id}/recusar`, { motivo: motivo || null }),
}

export const admin = {
  indicadores: () => api('/admin/indicadores'),
  fornecedores: () => api('/admin/fornecedores'),
  aprovar: (id) => post(`/admin/fornecedores/${id}/aprovar`),
  bloquear: (id) => post(`/admin/fornecedores/${id}/bloquear`),
  avaliacoes: () => api('/admin/avaliacoes'),
  removerAvaliacao: (id) => excluir(`/admin/avaliacoes/${id}`),
}
