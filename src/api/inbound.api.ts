import request from '@/utils/request'
import type { ApiResponse, PaginatedData } from '@/types'
import type { Location, Flow } from '@/types'

// 获取库位列表（按仓库过滤）
export function getLocations(params: { warehouseName: string }): Promise<ApiResponse<PaginatedData<Location>>> {
  return request.get('/api/v1/locations', { params })
}

// 创建流程（工程师入库等）
export function createFlow(data: {
  type: Flow['type']
  status: Flow['status']
  currentStep: string
  creator: string
  creatorId: number
  data: Record<string, unknown>
  approver: string
}): Promise<ApiResponse<Flow>> {
  return request.post('/api/v1/flows', data)
}

// 批量导入库存
export function importInventory(items: Record<string, unknown>[]): Promise<ApiResponse<{ success: number; failed: number; errors: string[] }>> {
  return request.post('/api/v1/inventory/import', items)
}

// 获取仓库列表（供下拉）
export function getWarehouses(): Promise<ApiResponse<PaginatedData<{ id: number; name: string }>>> {
  return request.get('/api/v1/warehouses')
}
