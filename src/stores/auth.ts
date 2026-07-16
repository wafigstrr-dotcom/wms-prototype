import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { loginApi } from '@/api/auth.api'

export interface UserInfo {
  id: number
  gid: string
  name: string
  email: string
  role: 'admin' | 'keeper' | 'engineer'
  department: string
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string>(localStorage.getItem('token') || '')
  const user = ref<UserInfo | null>(
    localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null
  )

  const isLoggedIn = computed(() => !!token.value && !!user.value)
  const userRole = computed(() => user.value?.role || '')
  const userName = computed(() => user.value?.name || '')

  async function login(gid: string, password: string) {
    try {
      const res = await loginApi({ account: gid, password })
      if (res.code === 200) {
        token.value = res.data.token
        user.value = res.data.user
        localStorage.setItem('token', res.data.token)
        localStorage.setItem('user', JSON.stringify(res.data.user))
        return { success: true }
      }
      return { success: false, message: res.message }
    } catch (error: any) {
      return { success: false, message: error.message || '登录异常' }
    }
  }

  function logout() {
    token.value = ''
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  return { token, user, isLoggedIn, userRole, userName, login, logout }
})
