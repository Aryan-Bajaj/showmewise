import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync, mkdirSync, copyFileSync } from 'node:fs'
import { resolve, join, dirname, extname } from 'node:path'

// Serve the OCR engine and the ONNX runtime from our own origin instead of a
// public CDN. Left alone, tesseract.js and transformers.js both fetch these
// from jsdelivr, so a third party sees a request every time someone reads a
// screen or transcribes audio. The files are copied out of node_modules at
// build time, which keeps them in step with the installed package version
// instead of drifting as a checked-in copy would.
const RUNTIME_ASSETS = {
  'tesseract/worker.min.js': 'tesseract.js/dist/worker.min.js',
  // The core .wasm.js files carry the wasm inline as base64, so the matching
  // .wasm files are not needed alongside them.
  'tesseract/tesseract-core-relaxedsimd-lstm.wasm.js': 'tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js',
  'tesseract/tesseract-core-simd-lstm.wasm.js': 'tesseract.js-core/tesseract-core-simd-lstm.wasm.js',
  'tesseract/tesseract-core-lstm.wasm.js': 'tesseract.js-core/tesseract-core-lstm.wasm.js',
  // Two pairs: Safari gets the plain build, every other browser the asyncify one.
  'ort/ort-wasm-simd-threaded.asyncify.mjs': 'onnxruntime-web/dist/ort-wasm-simd-threaded.asyncify.mjs',
  'ort/ort-wasm-simd-threaded.asyncify.wasm': 'onnxruntime-web/dist/ort-wasm-simd-threaded.asyncify.wasm',
  'ort/ort-wasm-simd-threaded.mjs': 'onnxruntime-web/dist/ort-wasm-simd-threaded.mjs',
  'ort/ort-wasm-simd-threaded.wasm': 'onnxruntime-web/dist/ort-wasm-simd-threaded.wasm',
}

const MIME = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.wasm': 'application/wasm' }

function runtimeAssets() {
  const source = (p) => resolve(process.cwd(), 'node_modules', p)
  return {
    name: 'local-runtime-assets',
    // Dev server: the files live in node_modules, so hand them straight over.
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = (req.url || '').split('?')[0].replace(/^\//, '')
        const src = RUNTIME_ASSETS[path]
        if (!src) return next()
        res.setHeader('Content-Type', MIME[extname(path)] || 'application/octet-stream')
        res.end(readFileSync(source(src)))
      })
    },
    // Build: copy them next to the bundle.
    writeBundle(options) {
      for (const [out, src] of Object.entries(RUNTIME_ASSETS)) {
        const dest = join(options.dir, out)
        mkdirSync(dirname(dest), { recursive: true })
        copyFileSync(source(src), dest)
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), runtimeAssets()],
  optimizeDeps: {
    exclude: ['@huggingface/transformers', '@mlc-ai/web-llm', 'onnxruntime-web'],
    include: ['three', 'vanta/dist/vanta.net.min', 'vanta/dist/vanta.halo.min'],
  },
  worker: {
    format: 'es'
  },
  // Required for SharedArrayBuffer (Whisper WASM) in dev
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    }
  }
})
