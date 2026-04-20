import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

const trimTrailingSlash = value => value.replace(/\/+$/, '')

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const devServerPort = Number(env.VITE_DEV_PORT || 3000)
  const devApiOrigin = trimTrailingSlash(env.VITE_DEV_API_ORIGIN || 'http://localhost:5681')

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    server: {
      port: devServerPort,
      proxy: {
        '/api': {
          target: devApiOrigin,
          changeOrigin: true
        },
        '/files': {
          target: devApiOrigin,
          changeOrigin: true
        }
      }
    }
  }
})
