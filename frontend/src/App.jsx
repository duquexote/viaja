import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import RotaProtegida from './components/RotaProtegida.jsx'
import Admin from './pages/Admin.jsx'
import Assistente from './pages/Assistente.jsx'
import { BuscaHospedagens, BuscaPassagens, BuscaPasseios } from './pages/Busca.jsx'
import Cadastro from './pages/Cadastro.jsx'
import Comparar from './pages/Comparar.jsx'
import ConfirmarEmail from './pages/ConfirmarEmail.jsx'
import Entrar from './pages/Entrar.jsx'
import Fornecedor from './pages/Fornecedor.jsx'
import Inicio from './pages/Inicio.jsx'
import ItinerarioDetalhe from './pages/ItinerarioDetalhe.jsx'
import Itinerarios from './pages/Itinerarios.jsx'
import NaoEncontrada from './pages/NaoEncontrada.jsx'
import Notificacoes from './pages/Notificacoes.jsx'
import OfertaDetalhe from './pages/OfertaDetalhe.jsx'
import Perfil from './pages/Perfil.jsx'
import Reservas from './pages/Reservas.jsx'

const VIAJANTE = ['VIAJANTE']

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Inicio />} />
        <Route path="entrar" element={<Entrar />} />
        <Route path="cadastro" element={<Cadastro />} />
        <Route path="confirmar-email" element={<ConfirmarEmail />} />

        <Route path="passagens" element={<BuscaPassagens />} />
        <Route path="hospedagens" element={<BuscaHospedagens />} />
        <Route path="passeios" element={<BuscaPasseios />} />
        <Route path="comparar" element={<Comparar />} />
        <Route path="ofertas/:id" element={<OfertaDetalhe />} />

        <Route
          path="itinerarios"
          element={
            <RotaProtegida perfis={VIAJANTE}>
              <Itinerarios />
            </RotaProtegida>
          }
        />
        <Route
          path="itinerarios/:id"
          element={
            <RotaProtegida perfis={VIAJANTE}>
              <ItinerarioDetalhe />
            </RotaProtegida>
          }
        />
        <Route
          path="assistente"
          element={
            <RotaProtegida perfis={VIAJANTE}>
              <Assistente />
            </RotaProtegida>
          }
        />
        <Route
          path="reservas"
          element={
            <RotaProtegida perfis={VIAJANTE}>
              <Reservas />
            </RotaProtegida>
          }
        />

        <Route
          path="notificacoes"
          element={
            <RotaProtegida>
              <Notificacoes />
            </RotaProtegida>
          }
        />
        <Route
          path="perfil"
          element={
            <RotaProtegida>
              <Perfil />
            </RotaProtegida>
          }
        />

        <Route
          path="fornecedor"
          element={
            <RotaProtegida perfis={['FORNECEDOR']}>
              <Fornecedor />
            </RotaProtegida>
          }
        />
        <Route
          path="admin"
          element={
            <RotaProtegida perfis={['ADMINISTRADOR']}>
              <Admin />
            </RotaProtegida>
          }
        />

        <Route path="*" element={<NaoEncontrada />} />
      </Route>
    </Routes>
  )
}
