/**
 * 仓库配置 API 封装（仓库 + 库位）
 */
import request from '@/utils/request'
import type { ApiResponse, PaginatedData, Warehouse, Location } from '@/types'

type ListRes<T> = ApiResponse<PaginatedData<T>>
type ItemRes<T> = ApiResponse<T>

// ==================== 仓库 ====================

export function getWarehouses(keyword?: string): Promise<ListRes<Warehouse>> {
  const params: Record<string, string> = {}
  if (keyword) params.keyword = keyword
  return request.get('/api/v1/warehouses', { params })
}

export function createWarehouse(data: Omit<Warehouse, 'id' | 'createTime'>): Promise<ItemRes<Warehouse>> {
  return request.post('/api/v1/warehouses', data)
}

export function updateWarehouse(id: number, data: Partial<Warehouse>): Promise<ItemRes<Warehouse>> {
  return request.put(`/api/v1/warehouses/${id}`, data)
}

export function deleteWarehouse(id: number): Promise<ApiResponse<null>> {
  return request.delete(`/api/v1/warehouses/${id}`)
}

export interface BatchWhResult {
  success: Warehouse[]
  failed: { name: string; reason: string }[]
}
export function batchCreateWarehouses(items: Omit<Warehouse, 'id' | 'createTime'>[]): Promise<ApiResponse<BatchWhResult>> {
  return request.post('/api/v1/warehouses/batch', { items })
}

// ==================== 库位 ====================

export function getLocations(warehouseName?: string, keyword?: string): Promise<ListRes<Location>> {
  const params: Record<string, string> = {}
  if (warehouseName) params.warehouseName = warehouseName
  if (keyword) params.keyword = keyword
  return request.get('/api/v1/locations', { params })
}

export function createLocation(data: Omit<Location, 'id' | 'createTime'>): Promise<ItemRes<Location>> {
  return request.post('/api/v1/locations', data)
}

export function updateLocation(id: number, data: Partial<Location>): Promise<ItemRes<Location>> {
  return request.put(`/api/v1/locations/${id}`, data)
}

export function deleteLocation(id: number): Promise<ApiResponse<null>> {
  return request.delete(`/api/v1/locations/${id}`)
}

export interface BatchLocResult {
  success: Location[]
  failed: { locationCode: string; reason: string }[]
}
export function batchCreateLocations(items: Omit<Location, 'id' | 'createTime'>[]): Promise<ApiResponse<BatchLocResult>> {
  return request.post('/api/v1/locations/batch', { items })
}

export function batchDeleteLocations(ids: number[]): Promise<ApiResponse<{ deleted: number }>> {
  return request.delete('/api/v1/locations/batch', { data: { ids } })
}
