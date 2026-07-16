/**
 * MSW Service Worker 注册入口（浏览器端）
 * 在 main.ts 中动态 import 此文件以启动 worker
 */
import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'
import { ensureSeed } from './db'

export const worker = setupWorker(...handlers)

/** 初始化：启动 worker 并写入种子数据 */
export async function startMockWorker() {
  await ensureSeed()
  await worker.start({
    // 使用 Vite 的 BASE_URL 定位 Service Worker，兼容根路径与子路径部署（如 GitHub Pages）
    serviceWorker: {
      url: `${import.meta.env.BASE_URL}mockServiceWorker.js`,
    },
    onUnhandledRequest: 'bypass',  // 未匹配的请求透传，不报错
    quiet: true,                   // 静默模式，不打印每条拦截日志
  })
}
