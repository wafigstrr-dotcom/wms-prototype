import { http, HttpResponse } from 'msw'
import { WarehousesDb } from './db'
import type { Warehouse } from '../types'

export const warehousesHandlers = [
  http.get('/api/v1/warehouses', async ({ request }) => {
    const url = new URL(request.url)
    const keyword = (url.searchParams.get('keyword') || '').toLowerCase()

    let items = await WarehousesDb.getAll()
    if (keyword) {
      items = items.filter(w =>
        w.name.toLowerCase().includes(keyword) ||
        w.location.toLowerCase().includes(keyword) ||
        w.attribute.toLowerCase().includes(keyword)
      )
    }

    return HttpResponse.json({ code: 200, message: '查询成功', data: { list: items, total: items.length, page: 1, pageSize: items.length } })
  }),

  http.post('/api/v1/warehouses', async ({ request }) => {
    const body = await request.json() as Omit<Warehouse, 'id' | 'createTime'>
    const existing = await WarehousesDb.getAll()
    if (existing.some(w => w.name === body.name)) {
      return HttpResponse.json({ code: 40002, message: '仓库名称已存在', data: null })
    }
    const item = await WarehousesDb.add(body)
    return HttpResponse.json({ code: 200, message: '创建成功', data: item })
  }),

  http.put('/api/v1/warehouses/:id', async ({ request, params }) => {
    const id = Number(params.id)
    const body = await request.json() as Partial<Warehouse>
    const existing = await WarehousesDb.getAll()
    if (body.name && existing.some(w => w.id !== id && w.name === body.name)) {
      return HttpResponse.json({ code: 40002, message: '仓库名称已存在', data: null })
    }
    const updated = await WarehousesDb.update(id, body)
    if (!updated) return HttpResponse.json({ code: 40401, message: '仓库不存在', data: null })
    return HttpResponse.json({ code: 200, message: '更新成功', data: updated })
  }),

  // 批量创建仓库
  http.post('/api/v1/warehouses/batch', async ({ request }) => {
    const { items: newItems } = await request.json() as { items: Omit<Warehouse, 'id' | 'createTime'>[] }
    const existing = await WarehousesDb.getAll()
    const nameSet = new Set(existing.map(w => w.name.toUpperCase()))

    const success: Warehouse[] = []
    const failed: { name: string; reason: string }[] = []

    for (const item of newItems) {
      const upperName = item.name.toUpperCase()
      if (nameSet.has(upperName)) { failed.push({ name: item.name, reason: '仓库名称已存在' }); continue }
      const created = await WarehousesDb.add({ ...item, name: upperName })
      nameSet.add(upperName)
      success.push(created)
    }

    return HttpResponse.json({
      code: 200,
      message: `成功新增 ${success.length} 个仓库${failed.length > 0 ? `，${failed.length} 个已跳过` : ''}`,
      data: { success, failed },
    })
  }),

  http.delete('/api/v1/warehouses/:id', async ({ params }) => {
    const ok = await WarehousesDb.remove(Number(params.id))
    return HttpResponse.json(ok
      ? { code: 200, message: '删除成功', data: null }
      : { code: 40401, message: '仓库不存在', data: null })
  }),
]
