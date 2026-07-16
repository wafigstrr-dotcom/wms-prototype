import { http, HttpResponse } from 'msw'
import { InventoryDb } from './db'

export const inboundHandlers = [
  http.post('/api/v1/inventory/import', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>[]
    let success = 0
    let failed = 0
    const errors: string[] = []

    for (let idx = 0; idx < body.length; idx++) {
      const row = body[idx]
      try {
        if (!row.materialName) {
          failed++
          errors.push(`第${idx + 2}行：物料名称不能为空`)
          continue
        }
        if (!row.quantity || Number(row.quantity) <= 0) {
          failed++
          errors.push(`第${idx + 2}行：数量必须大于0`)
          continue
        }
        await InventoryDb.add({
          materialName: String(row.materialName || ''),
          materialCode: String(row.materialCode || ''),
          projectCode: String(row.projectCode || ''),
          pbu: String(row.pbu || ''),
          exempt3C: String(row.exempt3C || ''),
          materialCategory: String(row.materialCategory || ''),
          owner: String(row.owner || ''),
          department: String(row.department || ''),
          poNumber: String(row.poNumber || ''),
          supplierCode: String(row.supplierCode || ''),
          quantity: Number(row.quantity) || 0,
          unit: String(row.unit || '件'),
          warehouse: String(row.warehouse || ''),
          location: String(row.location || ''),
          unitPrice: Number(row.unitPrice) || 0,
        })
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
]
