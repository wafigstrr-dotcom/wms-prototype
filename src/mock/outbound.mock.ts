import { http, HttpResponse } from 'msw'
import { FlowsDb, InventoryDb } from './db'

export const outboundHandlers = [
  // 锁定量查询：从 pending/approving 状态的 outbound 流程中计算
  http.get('/api/v1/outbound/locked', async () => {
    const flows = await FlowsDb.getAll()
    const lockedMap: Record<string, number> = {}

    flows
      .filter(f =>
        (f.type === 'outbound_request' || f.type === 'outbound_scrap') &&
        (f.status === 'pending' || f.status === 'approving')
      )
      .forEach(flow => {
        const items = (flow.data as any)?.items
        if (!Array.isArray(items)) return
        const qtyField = flow.type === 'outbound_request' ? 'reqQty' : 'scrapQty'
        items.forEach((item: any) => {
          const key = item.inboundNo
          if (!key) return
          lockedMap[key] = (lockedMap[key] || 0) + (Number(item[qtyField]) || 0)
        })
      })

    return HttpResponse.json({ code: 200, message: '查询成功', data: lockedMap })
  }),

  // 库存扣减：审批通过后调用，按 inboundNo 扣减 remainingStock
  http.post('/api/v1/outbound/consume', async ({ request }) => {
    const body = await request.json() as { items: { inboundNo: string; qty: number }[] }
    const inventory = await InventoryDb.getAll()
    const results: { inboundNo: string; success: boolean; message: string }[] = []

    for (const item of body.items) {
      const found = inventory.find(i => i.inboundNo === item.inboundNo)
      if (!found) {
        results.push({ inboundNo: item.inboundNo, success: false, message: '入库单号不存在' })
        continue
      }
      if (found.remainingStock < item.qty) {
        results.push({ inboundNo: item.inboundNo, success: false, message: `库存不足（剩余 ${found.remainingStock}）` })
        continue
      }
      await InventoryDb.update(found.id, { remainingStock: found.remainingStock - item.qty })
      results.push({ inboundNo: item.inboundNo, success: true, message: '扣减成功' })
    }

    return HttpResponse.json({ code: 200, message: '库存扣减完成', data: results })
  }),
]
