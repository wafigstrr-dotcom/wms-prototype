import { http, HttpResponse } from 'msw'
import { DirectMaterialDb, DirectMaterialSubItemDb } from './db'
import type { DirectMaterial, DirectMaterialSubItem } from '../types'

type NewDirectMaterial = Omit<DirectMaterial, 'id' | 'createTime'>
type NewSubItem = Omit<DirectMaterialSubItem, 'id' | 'parentId' | 'createTime'>

// Excel 中文表头 → 字段映射（供批量导入解析）
const HEADER_MAP: Record<string, keyof NewDirectMaterial> = {
  下单日期: 'orderDate',
  申请人: 'applicant',
  所属人: 'owner',
  PBU: 'pbu',
  所属部门: 'department',
  项目编号: 'projectCode',
  采购工程师: 'purchaseEngineer',
  'SAP号/图号': 'sapDrawingNo',
  物料名称: 'purchaseDescription',
  采购描述: 'purchaseDescription',
  PR号: 'prNo',
  'item号': 'item',
  item: 'item',
  采购组: 'purchaseGroup',
  数量: 'quantity',
  '免3C': 'exempt3C',
  供应商代码: 'supplierCode',
  供应商名称: 'supplierName',
  金额: 'amount',
  PO号: 'poNo',
  交货日期: 'deliveryDate',
  发送供方: 'sentToSupplier',
  备注: 'remark',
}

// 旧数据兼容：新增字段缺失时补默认值（IndexedDB 中的早期数据不含这些字段）
function withDefaults(m: DirectMaterial): DirectMaterial {
  return {
    ...m,
    owner: m.owner ?? '',
    pbu: m.pbu ?? '',
    department: m.department ?? '',
    projectCode: m.projectCode ?? '',
    exempt3C: m.exempt3C ?? '',
    sapDrawingNo: m.sapDrawingNo ?? '',
  }
}

// 将 Excel 序列号/字符串日期统一格式化为 YYYY-MM-DD
function normalizeDate(v: unknown): string {
  if (v === null || v === undefined || v === '') return ''
  if (typeof v === 'number') {
    // Excel 日期序列号（以 1899-12-30 为基准）
    const ms = Math.round((v - 25569) * 86400 * 1000)
    return new Date(ms).toISOString().slice(0, 10)
  }
  const s = String(v).trim()
  const d = new Date(s.replace(/\//g, '-'))
  return isNaN(d.getTime()) ? s : d.toISOString().slice(0, 10)
}

export const directMaterialHandlers = [
  // 列表查询
  http.get('/api/v1/direct-materials', async ({ request }) => {
    const url = new URL(request.url)
    const keyword = (url.searchParams.get('keyword') || '').toLowerCase()
    const sent = url.searchParams.get('sentToSupplier') || ''

    let items = (await DirectMaterialDb.getAll()).map(withDefaults)
    if (keyword) {
      items = items.filter(m =>
        (m.applicant || '').toLowerCase().includes(keyword) ||
        (m.owner || '').toLowerCase().includes(keyword) ||
        (m.projectCode || '').toLowerCase().includes(keyword) ||
        (m.purchaseEngineer || '').toLowerCase().includes(keyword) ||
        (m.purchaseDescription || '').toLowerCase().includes(keyword) ||
        (m.sapDrawingNo || '').toLowerCase().includes(keyword) ||
        (m.prNo || '').toLowerCase().includes(keyword) ||
        (m.poNo || '').toLowerCase().includes(keyword) ||
        (m.supplierName || '').toLowerCase().includes(keyword) ||
        (m.supplierCode || '').toLowerCase().includes(keyword)
      )
    }
    if (sent) items = items.filter(m => m.sentToSupplier === sent)

    // 按下单日期倒序
    items = [...items].sort((a, b) => (b.orderDate || '').localeCompare(a.orderDate || ''))

    // 附加子项数量（列表专用，不落库）
    const countMap = await DirectMaterialSubItemDb.countByParent()
    items = items.map(m => ({ ...m, subItemCount: countMap[m.id] || 0 }))

    return HttpResponse.json({ code: 200, message: '查询成功', data: { list: items, total: items.length, page: 1, pageSize: items.length } })
  }),

  // 新增
  http.post('/api/v1/direct-materials', async ({ request }) => {
    const body = await request.json() as NewDirectMaterial
    if (body.poNo) {
      const existing = await DirectMaterialDb.getAll()
      if (existing.some(m => m.poNo && m.poNo === body.poNo)) {
        return HttpResponse.json({ code: 40002, message: `PO号「${body.poNo}」已存在`, data: null })
      }
    }
    const item = await DirectMaterialDb.add(body)
    return HttpResponse.json({ code: 200, message: '创建成功', data: item })
  }),

  // 更新
  http.put('/api/v1/direct-materials/:id', async ({ request, params }) => {
    const id = Number(params.id)
    const body = await request.json() as Partial<DirectMaterial>
    if (body.poNo) {
      const existing = await DirectMaterialDb.getAll()
      if (existing.some(m => m.id !== id && m.poNo && m.poNo === body.poNo)) {
        return HttpResponse.json({ code: 40002, message: `PO号「${body.poNo}」已存在`, data: null })
      }
    }
    const updated = await DirectMaterialDb.update(id, body)
    if (!updated) return HttpResponse.json({ code: 40401, message: '记录不存在', data: null })
    return HttpResponse.json({ code: 200, message: '更新成功', data: updated })
  }),

  // 删除（软删除）
  http.delete('/api/v1/direct-materials/:id', async ({ params }) => {
    const ok = await DirectMaterialDb.remove(Number(params.id))
    return HttpResponse.json(ok
      ? { code: 200, message: '删除成功', data: null }
      : { code: 40401, message: '记录不存在', data: null })
  }),

  // 批量删除
  http.delete('/api/v1/direct-materials/batch', async ({ request }) => {
    const { ids } = await request.json() as { ids: number[] }
    let deleted = 0
    for (const id of ids) {
      if (await DirectMaterialDb.remove(id)) deleted++
    }
    return HttpResponse.json({ code: 200, message: `已删除 ${deleted} 条记录`, data: { deleted } })
  }),

  // 批量导入（Excel）
  http.post('/api/v1/direct-materials/import', async ({ request }) => {
    const rows = await request.json() as Record<string, unknown>[]
    let success = 0
    let failed = 0
    const errors: string[] = []

    // 已有 PO号集合（用于导入内去重）
    const existing = await DirectMaterialDb.getAll()
    const poSet = new Set(existing.filter(m => m.poNo).map(m => m.poNo))

    for (let idx = 0; idx < rows.length; idx++) {
      const raw = rows[idx]
      try {
        // 按中文表头映射为字段
        const mapped: Record<string, unknown> = {}
        for (const [header, value] of Object.entries(raw)) {
          const field = HEADER_MAP[header.trim()]
          if (field) mapped[field] = value
        }

        const orderDate = normalizeDate(mapped.orderDate)
        const applicant = String(mapped.applicant || '').trim()
        const purchaseEngineer = String(mapped.purchaseEngineer || '').trim()
        const purchaseDescription = String(mapped.purchaseDescription || '').trim()

        if (!orderDate) { failed++; errors.push(`第${idx + 2}行：下单日期不能为空`); continue }
        if (!applicant) { failed++; errors.push(`第${idx + 2}行：申请人不能为空`); continue }
        if (!purchaseEngineer) { failed++; errors.push(`第${idx + 2}行：采购工程师不能为空`); continue }
        if (!purchaseDescription) { failed++; errors.push(`第${idx + 2}行：物料名称不能为空`); continue }

        const poNo = String(mapped.poNo || '').trim()
        if (poNo && poSet.has(poNo)) { failed++; errors.push(`第${idx + 2}行：PO号「${poNo}」已存在`); continue }

        const sentRaw = String(mapped.sentToSupplier || '').trim()
        const sentToSupplier: '是' | '否' = sentRaw === '是' ? '是' : '否'

        await DirectMaterialDb.add({
          orderDate,
          applicant,
          owner: String(mapped.owner || '').trim(),
          pbu: String(mapped.pbu || '').trim(),
          department: String(mapped.department || '').trim(),
          projectCode: String(mapped.projectCode || '').trim(),
          purchaseEngineer,
          sapDrawingNo: String(mapped.sapDrawingNo || '').trim(),
          purchaseDescription,
          prNo: String(mapped.prNo || '').trim(),
          item: String(mapped.item || '').trim(),
          purchaseGroup: String(mapped.purchaseGroup || '').trim(),
          quantity: Number(mapped.quantity) || 0,
          exempt3C: String(mapped.exempt3C || '').trim(),
          supplierCode: String(mapped.supplierCode || '').trim(),
          supplierName: String(mapped.supplierName || '').trim(),
          amount: Number(mapped.amount) || 0,
          poNo,
          deliveryDate: normalizeDate(mapped.deliveryDate),
          sentToSupplier,
          remark: String(mapped.remark || '').trim(),
        })
        if (poNo) poSet.add(poNo)
        success++
      } catch {
        failed++
        errors.push(`第${idx + 2}行：导入失败`)
      }
    }

    return HttpResponse.json({
      code: 200,
      message: `导入完成：成功${success}条，失败${failed}条`,
      data: { success, failed, errors },
    })
  }),

  // ==================== 子项（BOM 明细）====================
  // 子项列表
  http.get('/api/v1/direct-materials/:parentId/sub-items', async ({ params }) => {
    const list = await DirectMaterialSubItemDb.getByParent(Number(params.parentId))
    return HttpResponse.json({ code: 200, message: '查询成功', data: list })
  }),

  // 新增子项
  http.post('/api/v1/direct-materials/:parentId/sub-items', async ({ request, params }) => {
    const parentId = Number(params.parentId)
    const parent = (await DirectMaterialDb.getAll()).find(m => m.id === parentId)
    if (!parent) return HttpResponse.json({ code: 40401, message: '主记录不存在', data: null })
    const body = await request.json() as NewSubItem
    if (!body.purchaseDescription || !String(body.purchaseDescription).trim()) {
      return HttpResponse.json({ code: 40001, message: '物料名称不能为空', data: null })
    }
    if (!body.quantity || Number(body.quantity) < 1) {
      return HttpResponse.json({ code: 40001, message: '数量必须大于等于 1', data: null })
    }
    const item = await DirectMaterialSubItemDb.add(parentId, body)
    return HttpResponse.json({ code: 200, message: '创建成功', data: item })
  }),

  // 更新子项
  http.put('/api/v1/direct-materials/:parentId/sub-items/:id', async ({ request, params }) => {
    const body = await request.json() as Partial<NewSubItem>
    if (body.purchaseDescription !== undefined && !String(body.purchaseDescription).trim()) {
      return HttpResponse.json({ code: 40001, message: '物料名称不能为空', data: null })
    }
    if (body.quantity !== undefined && Number(body.quantity) < 1) {
      return HttpResponse.json({ code: 40001, message: '数量必须大于等于 1', data: null })
    }
    const updated = await DirectMaterialSubItemDb.update(Number(params.id), body)
    if (!updated) return HttpResponse.json({ code: 40401, message: '子项不存在', data: null })
    return HttpResponse.json({ code: 200, message: '更新成功', data: updated })
  }),

  // 删除子项（软删除）
  http.delete('/api/v1/direct-materials/:parentId/sub-items/:id', async ({ params }) => {
    const ok = await DirectMaterialSubItemDb.remove(Number(params.id))
    return HttpResponse.json(ok
      ? { code: 200, message: '删除成功', data: null }
      : { code: 40401, message: '子项不存在', data: null })
  }),
]
