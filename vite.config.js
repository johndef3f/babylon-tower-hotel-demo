import { defineConfig } from 'vite'
import fs from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 接收 GUI 傳來的 params，寫回 src/main.js 的 params 區塊
function saveParamsPlugin() {
  return {
    name: 'save-params',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url !== '/api/save-params' || req.method !== 'POST') {
          return next()
        }

        let body = ''
        req.on('data', chunk => { body += chunk })
        req.on('end', () => {
          try {
            const params = JSON.parse(body)
            const filePath = path.resolve(__dirname, 'src/main.js')
            let src = fs.readFileSync(filePath, 'utf-8')

            // 在 params 物件區塊內逐一替換數值
            src = src.replace(
              /(\/\/ §PARAMS_START[\s\S]*?const params = \{)([\s\S]*?)(^\})/m,
              (_, before, block, closing) => {
                for (const [key, val] of Object.entries(params)) {
                  const newVal = typeof val === 'string' ? `'${val}'` : val
                  block = block.replace(
                    new RegExp(`(\\b${key}:\\s*)(-?\\d+(?:\\.\\d+)?|'[^']*')`),
                    `$1${newVal}`
                  )
                }
                return before + block + closing
              }
            )

            fs.writeFileSync(filePath, src, 'utf-8')
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true }))
          } catch (e) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: e.message }))
          }
        })
      })
    },
  }
}

export default defineConfig({
  publicDir: 'assets',
  plugins: [saveParamsPlugin()],
})
