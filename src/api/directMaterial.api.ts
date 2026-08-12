/**
 * 直接物料维护 API 封装
 */
import request from '@/utils/request'
import type { ApiResponse, PaginatedData, DirectMaterial, DirectMaterialSubItem } from '@/types'

type ListRes = ApiResponse<PaginatedData<DirectMaterial>>
type ItemRes = ApiResponse<DirectMaterial>

export type NewDirectMaterial = Omit<DirectMaterial, 'id' | 'createTime'>

export interface ImportResult {
  success: number
  failed: number
  errors: string[]
}

export function getDirectMaterials(params?: { keyword?: string; sentToSupplier?: string }): Promise<ListRes> {
  const query: Record<string, string> = {}
  if (params?.keyword) query.keyword = params.keyword
  if (params?.sentToSupplier) query.sentToSupplier = params.sentToSupplier
  return request.get('/api/v1/direct-materials', { params: query })
}

export function createDirectMaterial(data: NewDirectMaterial): Promise<ItemRes> {
  return request.post('/api/v1/direct-materials', data)
}

export function updateDirectMaterial(id: number, data: Partial<DirectMaterial>): Promise<ItemRes> {
  return request.put(`/api/v1/direct-materials/${id}`, data)
}

export function deleteDirectMaterial(id: number): Promise<ApiResponse<null>> {
  return request.delete(`/api/v1/direct-materials/${id}`)
}

export function batchDeleteDirectMaterials(ids: number[]): Promise<ApiResponse<{ deleted: number }>> {
  return request.delete('/api/v1/direct-materials/batch', { data: { ids } })
}

export function importDirectMaterials(rows: Record<string, unknown>[]): Promise<ApiResponse<ImportResult>> {
  return request.post('/api/v1/direct-materials/import', rows)
}

// ==================== 子项（BOM 明细）====================
export type NewSubItem = Omit<DirectMaterialSubItem, 'id' | 'parentId' | 'createTime'>

export function getSubItems(parentId: number): Promise<ApiResponse<DirectMaterialSubItem[]>> {
  return request.get(`/api/v1/direct-materials/${parentId}/sub-items`)
}

export function createSubItem(parentId: number, data: NewSubItem): Promise<ApiResponse<DirectMaterialSubItem>> {
  return request.post(`/api/v1/direct-materials/${parentId}/sub-items`, data)
}

export function updateSubItem(parentId: number, id: number, data: Partial<NewSubItem>): Promise<ApiResponse<DirectMaterialSubItem>> {
  return request.put(`/api/v1/direct-materials/${parentId}/sub-items/${id}`, data)
}

export function deleteSubItem(parentId: number, id: number): Promise<ApiResponse<null>> {
  return request.delete(`/api/v1/direct-materials/${parentId}/sub-items/${id}`)
}
