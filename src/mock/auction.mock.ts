import { http, HttpResponse } from 'msw'
import { AuctionDb } from './db'
import type { AuctionFile } from './db'

export const auctionHandlers = [
  // 获取全部拍卖文件存档
  http.get('/api/v1/auction/files', async () => {
    const data = await AuctionDb.getAll()
    return HttpResponse.json({ code: 200, message: '查询成功', data })
  }),

  // 上传文件（追加到指定 fileId）
  http.post('/api/v1/auction/files/:id', async ({ request, params }) => {
    const fileId = params.id as string
    const body = await request.json() as AuctionFile
    const data = await AuctionDb.getAll()
    if (!data[fileId]) data[fileId] = []
    data[fileId].push(body)
    await AuctionDb.save(data)
    return HttpResponse.json({ code: 200, message: '上传成功', data: null })
  }),

  // 删除指定文件
  http.delete('/api/v1/auction/files/:id/:index', async ({ params }) => {
    const fileId = params.id as string
    const index = Number(params.index)
    const data = await AuctionDb.getAll()
    if (data[fileId] && Array.isArray(data[fileId])) {
      data[fileId].splice(index, 1)
      if (data[fileId].length === 0) delete data[fileId]
    }
    await AuctionDb.save(data)
    return HttpResponse.json({ code: 200, message: '删除成功', data: null })
  }),
]
