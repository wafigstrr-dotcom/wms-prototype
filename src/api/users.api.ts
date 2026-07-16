/**
 * 用户管理 API 封装
 */
import request from '@/utils/request'
import type { ApiResponse, User, UserPublic } from '@/types'

type UserListResponse = ApiResponse<{ list: UserPublic[]; total: number; page: number; pageSize: number }>

// 获取用户列表（支持 keyword/role 过滤）
export function getUsers(keyword?: string, role?: string): Promise<UserListResponse> {
  const params: Record<string, string> = {}
  if (keyword) params.keyword = keyword
  if (role) params.role = role
  return request.get('/api/v1/users', { params })
}

// 新增用户
export function createUser(data: Omit<User, 'id'>): Promise<ApiResponse<UserPublic>> {
  return request.post('/api/v1/users', data)
}

// 更新用户
export function updateUser(id: number, data: Partial<User>): Promise<ApiResponse<UserPublic>> {
  return request.put(`/api/v1/users/${id}`, data)
}

// 删除用户
export function deleteUser(id: number): Promise<ApiResponse<null>> {
  return request.delete(`/api/v1/users/${id}`)
}

// 批量创建用户
export interface BatchResult {
  success: UserPublic[]
  failed: { gid: string; reason: string }[]
}
export function batchCreateUsers(users: Omit<User, 'id'>[]): Promise<ApiResponse<BatchResult>> {
  return request.post('/api/v1/users/batch', { users })
}
