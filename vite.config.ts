import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import legacy from '@vitejs/plugin-legacy'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  // 部署基础路径：默认根路径（Cloudflare/Vercel），
  // GitHub Pages 项目站点构建时通过 DEPLOY_BASE 环境变量注入子路径（如 /wms-prototype/）
  base: process.env.DEPLOY_BASE || '/',
  plugins: [
    vue(),
    legacy({
      targets: ['defaults', 'not IE 11', 'chrome >= 49'],
      additionalLegacyPolyfills: ['regenerator-runtime/runtime']
    }),
    AutoImport({
      resolvers: [ElementPlusResolver()],
      imports: ['vue', 'vue-router', 'pinia'],
      dts: 'src/auto-imports.d.ts',
    }),
    Components({
      resolvers: [ElementPlusResolver()],
      dts: 'src/components.d.ts',
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
})
