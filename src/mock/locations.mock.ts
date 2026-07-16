import { http, HttpResponse } from 'msw'
import { LocationsDb } from './db'
import type { Location } from '../types'

export const locationsHandlers = [
  http.get('/api/v1/locations', async ({ request }) => {
    const url = new URL(request.url)
    const warehouseName = url.searchParams.get('warehouseName')
    const keyword = (url.searchParams.get('keyword') || '').toLowerCase()

    let items = await LocationsDb.getAll()
    if (warehouseName) items = items.filter(l => l.warehouseName === warehouseName)
    if (keyword) {
      items = items.filter(l =>
        l.locationCode.toLowerCase().includes(keyword) ||
        l.manager.toLowerCase().includes(keyword)
      )
    }

    return HttpResponse.json({ code: 200, message: '查询成功', data: { list: items, total: items.length, page: 1, pageSize: items.length } })
  }),

  http.post('/api/v1/locations', async ({ request }) => {
    const body = await request.json() as Omit<Location, 'id' | 'createTime'>
    const existing = await LocationsDb.getAll()
    if (existing.some(l => l.locationCode === body.locationCode && l.warehouseName === body.warehouseName)) {
      return HttpResponse.json({ code: 40002, message: '该仓库下库位编号已存在', data: null })
    }
    const item = await LocationsDb.add(body)
    return HttpResponse.json({ code: 200, message: '创建成功', data: item })
  }),

  http.put('/api/v1/locations/:id', async ({ request, params }) => {
    const id = Number(params.id)
    const body = await request.json() as Partial<Location>
    const existing = await LocationsDb.getAll()
    if (body.locationCode && body.warehouseName) {
      const dup = existing.some(l => l.id !== id && l.locationCode === body.locationCode && l.warehouseName === body.warehouseName)
      if (dup) return HttpResponse.json({ code: 40002, message: '该仓库下库位编号已存在', data: null })
    }
    const updated = await LocationsDb.update(id, body)
    if (!updated) return HttpResponse.json({ code: 40401, message: '库位不存在', data: null })
    return HttpResponse.json({ code: 200, message: '更新成功', data: updated })
  }),

  // 批量创建库位
  http.post('/api/v1/locations/batch', async ({ request }) => {
    const { items: newItems } = await request.json() as { items: Omit<Location, 'id' | 'createTime'>[] }
    const existing = await LocationsDb.getAll()
    const codeKey = (w: string, c: string) => `${w}||${c}`
    const codeSet = new Set(existing.map(l => codeKey(l.warehouseName, l.locationCode)))

    const success: Location[] = []
    const failed: { locationCode: string; reason: string }[] = []

    for (const item of newItems) {
      const key = codeKey(item.warehouseName, item.locationCode)
      if (codeSet.has(key)) { failed.push({ locationCode: item.locationCode, reason: '编号已存在' }); continue }
      const created = await LocationsDb.add(item)
      codeSet.add(key)
      success.push(created)
    }

    return HttpResponse.json({
      code: 200,
      message: `成功新增 ${success.length} 个库位${failed.length > 0 ? `，${failed.length} 个已跳过` : ''}`,
      data: { success, failed },
    })
  }),

  http.delete('/api/v1/locations/:id', async ({ params }) => {
    const ok = await LocationsDb.remove(Number(params.id))
    return HttpResponse.json(ok
      ? { code: 200, message: '删除成功', data: null }
      : { code: 40401, message: '库位不存在', data: null })
  }),

  // 批量删除库位
  http.delete('/api/v1/locations/batch', async ({ request }) => {
    const { ids } = await request.json() as { ids: number[] }
    let count = 0
    for (const id of ids) {
      if (await LocationsDb.remove(id)) count++
    }
    return HttpResponse.json({ code: 200, message: `已删除 ${count} 个库位`, data: { deleted: count } })
  }),
]
