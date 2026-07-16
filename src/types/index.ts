/**
 * 全局业务类型定义
 * 供 mock 层、API 层、Store 层共用，避免类型重复
 */

// ==================== 审计 / 软删除通用字段 ====================
// 说明：原型阶段无真实数据库，此处以 TS 字段体现《数据模型规范》要求的
// 审计字段（updatedAt）与软删除标记（isDeleted）。全栈阶段后端映射为
// snake_case 的 updated_at / is_deleted 列。
export interface AuditFields {
  updatedAt?: string
  isDeleted?: boolean
}

// ==================== 用户 ====================
export interface User extends AuditFields {
  id: number
  gid: string
  password: string
  name: string
  email: string
  role: 'admin' | 'keeper' | 'engineer'
  department: string
}

export interface UserPublic extends Omit<User, 'password'> {}

// ==================== 库存 ====================
export interface InventoryItem extends AuditFields {
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

// ==================== 流程 ====================
export interface ApprovalRecord {
  step: string
  approver: string
  result: 'approved' | 'rejected'
  comment: string
  time: string
}

export interface Flow extends AuditFields {
  id: number
  flowNo: string
  type: 'inbound_engineer' | 'outbound_request' | 'outbound_scrap' | 'transfer' | 'express' | 'scrap_workflow'
  status: 'pending' | 'approving' | 'approved' | 'rejected' | 'completed'
  currentStep: string | null
  approvalHistory: ApprovalRecord[]
  createTime: string
  creator: string
  creatorId: number
  data: Record<string, unknown>
  approver: string
  approveTime: string | null
  approveComment: string
}

// ==================== 仓库 ====================
export interface Warehouse extends AuditFields {
  id: number
  name: string
  location: string
  attribute: string
  type: string
  createTime: string
}

// ==================== 库位 ====================
export interface Location extends AuditFields {
  id: number
  warehouseName: string
  locationCode: string
  manager: string
  size: string
  createTime: string
}

// ==================== 统一响应体 ====================
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

export interface PaginatedData<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}
