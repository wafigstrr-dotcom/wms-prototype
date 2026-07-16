// 二维码打印模板配置 - localStorage 持久化

export interface PrintTemplate {
  width: number      // 标签宽度 mm
  height: number     // 标签高度 mm
  qrSize: number     // 二维码尺寸 px
  fontSize: number   // 文字字号 px
  showName: boolean
  showCode: boolean
  showOwner: boolean
  showDept: boolean
  showWarehouse: boolean
  showLocation: boolean
}

export const DEFAULT_TEMPLATE: PrintTemplate = {
  width: 60,
  height: 90,
  qrSize: 120,
  fontSize: 12,
  showName: true,
  showCode: true,
  showOwner: true,
  showDept: false,
  showWarehouse: false,
  showLocation: false,
}

const STORAGE_KEY = 'qrcode_template'

export function loadTemplate(): PrintTemplate {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const saved = JSON.parse(raw) as Partial<PrintTemplate>
      return { ...DEFAULT_TEMPLATE, ...saved }
    }
  } catch {
    // 解析失败，返回默认
  }
  return { ...DEFAULT_TEMPLATE }
}

export function saveTemplate(tpl: PrintTemplate): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tpl))
}

// 二维码文本内容拼接
export interface QRItem {
  materialName?: string
  materialCode?: string
  owner?: string
  department?: string
  warehouse?: string
  location?: string
}

export function buildQRText(item: QRItem): string {
  const parts: string[] = []
  if (item.materialName) parts.push('物料名称:' + item.materialName)
  if (item.materialCode) parts.push('物料编号:' + item.materialCode)
  if (item.owner) parts.push('所属人:' + item.owner)
  if (item.department) parts.push('所属部门:' + item.department)
  if (item.warehouse) parts.push('仓库:' + item.warehouse)
  if (item.location) parts.push('货位:' + item.location)
  return parts.join(' | ')
}

// 模板导出为 JSON 文件下载
export function exportTemplate(tpl: PrintTemplate): void {
  const dataStr = JSON.stringify(tpl, null, 2)
  const blob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const now = new Date()
  const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
  a.download = `二维码打印模板_${ts}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// 解析导入的模板 JSON
export function parseImportedTemplate(jsonStr: string): PrintTemplate | null {
  try {
    const data = JSON.parse(jsonStr) as Partial<PrintTemplate>
    if (typeof data.width !== 'number' && typeof data.qrSize !== 'number') return null
    return { ...DEFAULT_TEMPLATE, ...data }
  } catch {
    return null
  }
}
