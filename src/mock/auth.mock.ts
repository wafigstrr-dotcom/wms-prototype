import { http, HttpResponse } from 'msw'
import { UsersDb } from './db'

export const authHandlers = [
  http.post('/api/v1/auth/login', async ({ request }) => {
    const body = await request.json() as { account: string; password: string }
    const users = await UsersDb.getAll()
    const user = users.find(u => u.gid === body.account && u.password === body.password)
    if (user) {
      const { password: _pw, ...userInfo } = user
      return HttpResponse.json({
        code: 200,
        message: '登录成功',
        data: { token: `mock-token-${user.gid}-${Date.now()}`, user: userInfo },
      })
    }
    // 认证失败：GID 或密码错误 → 400 语义（错误码 40001）
    return HttpResponse.json({ code: 40001, message: 'GID 或密码错误', data: null })
  }),
]
