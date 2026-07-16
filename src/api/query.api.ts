import request from '@/utils/request'
import type { ApiResponse, PaginatedData } from '@/types'
import type { InventoryItem } from './inventory.api'

// ==================== 库存查询（复用 inventory 接口） ====================
export function getInventoryList(params?: object): Promise<ApiResponse<PaginatedData<InventoryItem>>> {
  return request.get('/api/v1/inventory', { params })
}

export function getInventoryStats(): Promise<ApiResponse<{ totalStock: number; monthlyInbound: number; dormantAlert: number }>> {
  return request.get('/api/v1/inventory/stats')
}

// ==================== 流程查询（复用 flows 接口） ====================
export function getFlowList(params?: object): Promise<ApiResponse<PaginatedData<any>>> {
  return request.get('/api/v1/flows', { params })
}

// ==================== 仓库列表 ====================
export function getWarehouses(): Promise<ApiResponse<PaginatedData<any>>> {
  return request.get('/api/v1/warehouses')
}

// ==================== 库位查询 ====================
export function getLocations(params?: object): Promise<ApiResponse<PaginatedData<any>>> {
  return request.get('/api/v1/locations', { params })
}

// ==================== 物料历史（新增） ====================
export interface HistoryRecord {
  type: string
  time: string
  flowNo: string
  name: string
  quantity: number | string
  warehouse: string
  location: string
  operator: string
  status: string
}

export function getMaterialHistory(code: string): Promise<ApiResponse<PaginatedData<HistoryRecord>>> {
  return request.get('/api/v1/query/material-history', { params: { code } })
}
