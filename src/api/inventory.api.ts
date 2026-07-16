import request from '@/utils/request'
import type { ApiResponse, PaginatedData } from '@/types'

export interface InventoryItem {
  id: number
  materialName: string
  materialCode: string
  projectCode: string
  pbu: string
  exempt3C: string
  materialCategory: string
  owner: string
  department: string
  poNumber: string
  supplierCode: string
  quantity: number
  unit: string
  warehouse: string
  location: string
  unitPrice: number
  inboundNo: string
  inboundTime: string
  remainingStock: number
  agingDays: number
  dormantDays: number
}

export interface InventoryStats {
  totalStock: number
  monthlyInbound: number
  dormantAlert: number
}

export function getInventoryStats(): Promise<ApiResponse<InventoryStats>> {
  return request.get('/api/v1/inventory/stats')
}

export function getInventoryList(params?: object): Promise<ApiResponse<PaginatedData<InventoryItem>>> {
  return request.get('/api/v1/inventory', { params })
}

export function addInventory(data: object): Promise<ApiResponse<InventoryItem>> {
  return request.post('/api/v1/inventory', data)
}
