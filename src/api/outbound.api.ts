import request from '@/utils/request'
import type { ApiResponse, PaginatedData, Flow } from '@/types'

// 锁定量查询（返回 { [inboundNo]: lockedQty }）
export function getLockedStock(): Promise<ApiResponse<Record<string, number>>> {
  return request.get('/api/v1/outbound/locked')
}

// 提交出库流程（领用/报废统一封装）
export function submitOutboundFlow(
  type: 'outbound_request' | 'outbound_scrap',
  data: {
    items: Array<Record<string, unknown>>
    reason?: string
    scrapOrderNo?: string
    attachments?: string[]
    applicant: string
    department: string
    approver: string
  }
): Promise<ApiResponse<Flow>> {
  return request.post('/api/v1/flows', {
    type,
    status: 'pending',
    currentStep: 'manager_approval',
    creator: data.applicant,
    creatorId: 0,
    data,
    approver: data.approver,
  })
}

// 查询我的出库申请
export function getMyOutboundFlows(creatorName: string): Promise<ApiResponse<PaginatedData<Flow>>> {
  return request.get('/api/v1/flows', {
    params: { creator: creatorName },
  })
}

// 库存扣减
export function consumeInventory(items: { inboundNo: string; qty: number }[]): Promise<ApiResponse<Array<{ inboundNo: string; success: boolean; message: string }>>> {
  return request.post('/api/v1/outbound/consume', { items })
}
