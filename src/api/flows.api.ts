import request from '@/utils/request'
import type { ApiResponse, PaginatedData } from '@/types'

export interface FlowItem {
  id: number
  flowNo: string
  type: string
  status: string
  currentStep: string | null
  createTime: string
  creator: string
  creatorId: number
  data: Record<string, unknown>
  approveTime: string | null
  approveComment: string
  approvalHistory: Array<{
    step: string
    approver: string
    result: string
    comment: string
    time: string
  }>
}

export function getPendingFlows(): Promise<ApiResponse<PaginatedData<FlowItem>>> {
  return request.get('/api/v1/flows/pending')
}

export function getAllFlows(params?: object): Promise<ApiResponse<PaginatedData<FlowItem>>> {
  return request.get('/api/v1/flows', { params })
}

export function createFlow(data: {
  type: string
  creator: string
  creatorId: number
  data: Record<string, unknown>
  status?: string
  currentStep?: string | null
  approver?: string
}): Promise<ApiResponse<FlowItem>> {
  return request.post('/api/v1/flows', data)
}

export function approveFlow(id: number, data: {
  approver: string
  comment: string
  nextStep: string
}): Promise<ApiResponse<FlowItem>> {
  return request.post(`/api/v1/flows/${id}/approve`, data)
}

export function rejectFlow(id: number, data: {
  approver: string
  comment: string
}): Promise<ApiResponse<FlowItem>> {
  return request.post(`/api/v1/flows/${id}/reject`, data)
}
