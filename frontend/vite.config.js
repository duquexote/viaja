import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Em desenvolvimento, o front-end chama /api e o Vite repassa para o back-end Spring Boot.
const backend = process.env.VIAJA_BACKEND_URL ?? 'http://localhost:8080'

const proxy = {
  '/api': {
    target: backend,
    changeOrigin: true,
    // Para o navegador a chamada é de mesma origem; sem o cabeçalho Origin o back-end não aplica CORS.
    // Assim o proxy funciona em qualquer porta (por exemplo, quando a 5173 está ocupada).
    configure: (servidor) => {
      servidor.on('proxyReq', (requisicao) => requisicao.removeHeader('origin'))
    },
  },
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173, proxy },
  preview: { port: 5173, proxy },
})
