import { http, HttpResponse } from 'msw'
import { InventoryDb } from './db'

export const inventoryHandlers = [
  http.get('/api/v1/inventory', async ({ request }) => {
    const url = new URL(request.url)
    const keyword = (url.searchParams.get('keyword') || '').toLowerCase()
    let items = await InventoryDb.getAll()
    if (keyword) {
      items = items.filter(i =>
        i.materialName.toLowerCase().includes(keyword) ||
        i.materialCode.toLowerCase().includes(keyword)
      )
    }
    return HttpResponse.json({ code: 200, message: '查询成功', data: { list: items, total: items.length, page: 1, pageSize: items.length } })
  }),

  http.get('/api/v1/inventory/stats', async () => {
    const items = await InventoryDb.getAll()
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
    return HttpResponse.json({
      code: 200, message: '查询成功',
      data: {
        totalStock: items.reduce((sum, i) => sum + i.remainingStock, 0),
        monthlyInbound: items.filter(i => i.inboundTime >= monthStart).length,
        dormantAlert: items.filter(i => i.dormantDays > 90).length,
      },
    })
  }),

  http.post('/api/v1/inventory', async ({ request }) => {
    const body = await request.json() as Parameters<typeof InventoryDb.add>[0]
    const item = await InventoryDb.add(body)
    return HttpResponse.json({ code: 200, message: '入库成功', data: item })
  }),

  http.put('/api/v1/inventory/:id', async ({ request, params }) => {
    const id = Number(params.id)
    const body = await request.json() as Record<string, unknown>
    const updated = await InventoryDb.update(id, body)
    if (!updated) {
      return HttpResponse.json({ code: 40401, message: '库存记录不存在', data: null })
    }
    return HttpResponse.json({ code: 200, message: '更新成功', data: updated })
  }),
]
