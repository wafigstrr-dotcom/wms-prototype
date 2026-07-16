import request from '@/utils/request'
import type { ApiResponse } from '@/types'

// 登录
export interface LoginParams {
  account: string
  password: string
}

export interface LoginResult {
  token: string
  user: {
    id: number
    gid: string
    name: string
    email: string
    role: 'admin' | 'keeper' | 'engineer'
    department: string
  }
}

export function loginApi(params: LoginParams): Promise<ApiResponse<LoginResult>> {
  return request.post('/api/v1/auth/login', params)
}
