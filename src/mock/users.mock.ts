import { http, HttpResponse } from 'msw'
import { UsersDb } from './db'
import type { User } from '../types'

export const usersHandlers = [
  http.get('/api/v1/users', async ({ request }) => {
    const url = new URL(request.url)
    const keyword = (url.searchParams.get('keyword') || '').toLowerCase()
    const role = url.searchParams.get('role') || ''

    let users = await UsersDb.getAll()

    // keyword 模糊匹配 gid/name/email/department
    if (keyword) {
      users = users.filter(u =>
        u.gid.toLowerCase().includes(keyword) ||
        u.name.toLowerCase().includes(keyword) ||
        u.email.toLowerCase().includes(keyword) ||
        u.department.toLowerCase().includes(keyword)
      )
    }
    // role 精确过滤
    if (role) {
      users = users.filter(u => u.role === role)
    }

    const safeUsers = users.map(({ password: _pw, ...u }) => u)
    return HttpResponse.json({
      code: 200, message: '查询成功',
      data: { list: safeUsers, total: safeUsers.length, page: 1, pageSize: safeUsers.length },
    })
  }),

  http.post('/api/v1/users', async ({ request }) => {
    const body = await request.json() as Omit<User, 'id'>
    const users = await UsersDb.getAll()
    if (users.some(u => u.gid === body.gid)) {
      return HttpResponse.json({ code: 40002, message: 'GID 已存在', data: null })
    }
    if (users.some(u => u.email === body.email)) {
      return HttpResponse.json({ code: 40003, message: '邮箱已被使用', data: null })
    }
    const newUser = await UsersDb.add(body)
    const { password: _pw, ...safeUser } = newUser
    return HttpResponse.json({ code: 200, message: '创建成功', data: safeUser })
  }),

  // 批量创建用户
  http.post('/api/v1/users/batch', async ({ request }) => {
    const { users: newUsers } = await request.json() as { users: Omit<User, 'id'>[] }
    const existing = await UsersDb.getAll()
    const gidSet = new Set(existing.map(u => u.gid.toLowerCase()))
    const emailSet = new Set(existing.map(u => u.email.toLowerCase()))

    const success: User[] = []
    const failed: { gid: string; reason: string }[] = []

    for (const u of newUsers) {
      const gidLow = u.gid.toLowerCase()
      const emailLow = u.email.toLowerCase()
      if (gidSet.has(gidLow)) { failed.push({ gid: u.gid, reason: 'GID 已存在' }); continue }
      if (emailSet.has(emailLow)) { failed.push({ gid: u.gid, reason: '邮箱已被使用' }); continue }
      const created = await UsersDb.add(u)
      gidSet.add(gidLow)
      emailSet.add(emailLow)
      success.push(created)
    }

    const safeSuccess = success.map(({ password: _pw, ...u }) => u)
    return HttpResponse.json({
      code: 200,
      message: `成功导入 ${safeSuccess.length} 个用户${failed.length > 0 ? `，跳过 ${failed.length} 条` : ''}`,
      data: { success: safeSuccess, failed },
    })
  }),

  http.put('/api/v1/users/:id', async ({ request, params }) => {
    const id = Number(params.id)
    const body = await request.json() as Partial<User>
    // 更新前检查 GID/邮箱唯一性（排除自身）
    const users = await UsersDb.getAll()
    if (body.gid && users.some(u => u.id !== id && u.gid === body.gid)) {
      return HttpResponse.json({ code: 40002, message: 'GID 已存在', data: null })
    }
    if (body.email && users.some(u => u.id !== id && u.email === body.email)) {
      return HttpResponse.json({ code: 40003, message: '邮箱已被使用', data: null })
    }
    const updated = await UsersDb.update(id, body)
    if (!updated) return HttpResponse.json({ code: 40401, message: '用户不存在', data: null })
    const { password: _pw, ...safeUser } = updated
    return HttpResponse.json({ code: 200, message: '更新成功', data: safeUser })
  }),

  http.delete('/api/v1/users/:id', async ({ params }) => {
    const ok = await UsersDb.remove(Number(params.id))
    return HttpResponse.json(ok
      ? { code: 200, message: '删除成功', data: null }
      : { code: 40401, message: '用户不存在', data: null })
  }),
]
