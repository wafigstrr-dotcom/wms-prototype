import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'
import { useAuthStore } from '@/stores/auth'

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 15000,
})

// 请求拦截器：注入 Token
request.interceptors.request.use(config => {
  const authStore = useAuthStore()
  if (authStore.token) {
    config.headers.Authorization = `Bearer ${authStore.token}`
  }
  return config
})

// 响应拦截器：统一错误处理
request.interceptors.response.use(
  response => {
    const { code, message } = response.data
    if (code !== 200) {
      ElMessage.error(message || '操作失败')
      if (code === 40101) {
        // Token 过期：清空登录态并跳转登录页
        useAuthStore().logout()
        router.push('/login')
      }
      return Promise.reject(response.data)
    }
    return response.data
  },
  error => {
    ElMessage.error('网络异常，请稍后重试')
    return Promise.reject(error)
  }
)

export default request
