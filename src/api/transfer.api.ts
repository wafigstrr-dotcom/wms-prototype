/**
 * 移库模块 API 封装
 * 复用现有 inventory / flows / warehouses / locations 接口，无新增 Mock
 */
import request from '@/utils/request'
import type { ApiResponse, InventoryItem, Flow, Warehouse, Location, PaginatedData } from '@/types'

// 获取全量库存（remainingStock > 0，由前端过滤）
export function getInventoryList(keyword?: string): Promise<ApiResponse<PaginatedData<InventoryItem>>> {
  return request.get('/api/v1/inventory', { params: keyword ? { keyword } : {} })
}

// 更新单条库存的仓库/货位（移库核心操作）
export function updateInventoryLocation(
  id: number,
  data: { warehouse: string; location: string }
): Promise<ApiResponse<InventoryItem>> {
  return request.put(`/api/v1/inventory/${id}`, data)
}

// 写入转移流水（type: 'transfer'）
export interface TransferFlowData {
  materialName: string
  materialCode: string
  inboundNo: string
  trfQty: number
  unit: string
  fromWarehouse: string
  fromLocation: string
  toWarehouse: string
  toLocation: string
  operator: string
}

export function createTransferFlow(
  data: TransferFlowData,
  creatorId: number
): Promise<ApiResponse<Flow>> {
  return request.post('/api/v1/flows', {
    type: 'transfer',
    status: 'completed',
    currentStep: null,
    creator: data.operator,
    creatorId,
    data,
    approver: '',
  })
}

// 获取仓库列表
export function getWarehouses(): Promise<ApiResponse<PaginatedData<Warehouse>>> {
  return request.get('/api/v1/warehouses')
}

// 按仓库获取库位列表
export function getLocationsByWarehouse(warehouseName: string): Promise<ApiResponse<PaginatedData<Location>>> {
  return request.get('/api/v1/locations', { params: { warehouseName } })
}
