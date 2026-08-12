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

// ==================== 直接物料 ====================
export interface DirectMaterial extends AuditFields {
  id: number
  orderDate: string          // 下单日期 YYYY-MM-DD
  applicant: string          // 申请人
  owner: string              // 所属人
  pbu: string                // PBU（AS/CS/IR/BMS/SS）
  department: string         // 所属部门
  projectCode: string        // 项目编号
  purchaseEngineer: string   // 采购工程师
  sapDrawingNo: string       // SAP号/图号
  purchaseDescription: string // 物料名称（原"采购描述"，表头显示为"物料名称"）
  prNo: string               // PR号
  item: string               // item号
  purchaseGroup: string      // 采购组
  quantity: number           // 数量
  exempt3C: string           // 免3C（是/否）
  supplierCode: string       // 供应商代码
  supplierName: string       // 供应商名称
  amount: number             // 金额
  poNo: string               // PO号
  deliveryDate: string       // 交货日期 YYYY-MM-DD
  sentToSupplier: '是' | '否' // 发送供方
  remark: string             // 备注
  createTime: string
  subItemCount?: number      // 子项数量（列表接口计算返回，不落库）
}

// 直接物料子项（BOM 明细）
export interface DirectMaterialSubItem extends AuditFields {
  id: number
  parentId: number            // 关联主记录 DirectMaterial.id
  sapDrawingNo: string        // SAP号/图号
  purchaseDescription: string // 物料名称
  quantity: number            // 数量
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
