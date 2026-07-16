import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import router from './router'
import App from './App.vue'
import { permission } from './directives/permission'

// 样式加载顺序：品牌 Token → Element Plus 覆盖 → 全局布局
import 'element-plus/theme-chalk/el-message.css'
import 'element-plus/theme-chalk/el-message-box.css'
import './styles/variables.css'
import './styles/element-overrides.css'
import './styles/layout.css'

const app = createApp(App)

// 注册 Element Plus 全部图标（按需使用 <el-icon><User /></el-icon>）
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(createPinia())
app.use(router)
app.use(ElementPlus)

// 注册全局自定义指令
app.directive('permission', permission)

// 启动 MSW（浏览器端 Mock + 种子数据）后再挂载应用
// 如果 MSW 启动失败（如企业防火墙/代理拦截 Service Worker），仍然挂载应用
async function bootstrap() {
  try {
    const { startMockWorker } = await import('./mock/browser')
    await startMockWorker()
  } catch (err) {
    console.warn('[MSW] Mock Service Worker 启动失败，应用将以无 Mock 模式运行:', err)
  }
  app.mount('#app')
}
bootstrap()
