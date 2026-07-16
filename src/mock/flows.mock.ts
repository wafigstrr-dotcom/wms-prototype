import { http, HttpResponse } from 'msw'
import { FlowsDb } from './db'

export const flowsHandlers = [
  http.get('/api/v1/flows', async ({ request }) => {
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const type = url.searchParams.get('type')
    const creator = url.searchParams.get('creator')
    let flows = await FlowsDb.getAll()
    if (status) flows = flows.filter(f => f.status === status)
    if (type) flows = flows.filter(f => f.type === type)
    if (creator) flows = flows.filter(f => f.creator === creator)
    flows.sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime())
    return HttpResponse.json({ code: 200, message: '查询成功', data: { list: flows, total: flows.length, page: 1, pageSize: flows.length } })
  }),

  http.get('/api/v1/flows/pending', async () => {
    const pending = (await FlowsDb.getAll())
      .filter(f => f.status === 'pending')
      .sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime())
    return HttpResponse.json({ code: 200, message: '查询成功', data: { list: pending, total: pending.length, page: 1, pageSize: pending.length } })
  }),

  http.post('/api/v1/flows', async ({ request }) => {
    const body = await request.json() as Parameters<typeof FlowsDb.add>[0]
    const flow = await FlowsDb.add(body)
    return HttpResponse.json({ code: 200, message: '流程创建成功', data: flow })
  }),

  http.post('/api/v1/flows/:id/approve', async ({ request, params }) => {
    const id = Number(params.id)
    const body = await request.json() as { approver: string; comment: string; nextStep: string }
    const flows = await FlowsDb.getAll()
    const flow = flows.find(f => f.id === id)
    if (!flow) return HttpResponse.json({ code: 40401, message: '流程不存在', data: null })
    const history = [...(flow.approvalHistory || [])]
    history.push({ step: flow.currentStep || '', approver: body.approver, result: 'approved', comment: body.comment, time: new Date().toISOString() })
    const updated = await FlowsDb.update(id, {
      currentStep: body.nextStep,
      status: body.nextStep === 'completed' ? 'completed' : 'pending',
      approveTime: new Date().toISOString(),
      approveComment: body.comment,
      approvalHistory: history,
    })
    if (!updated) return HttpResponse.json({ code: 40401, message: '流程不存在', data: null })
    return HttpResponse.json({ code: 200, message: '审批成功', data: updated })
  }),

  http.post('/api/v1/flows/:id/reject', async ({ request, params }) => {
    const id = Number(params.id)
    const body = await request.json() as { approver: string; comment: string }
    const flows = await FlowsDb.getAll()
    const flow = flows.find(f => f.id === id)
    if (!flow) return HttpResponse.json({ code: 40401, message: '流程不存在', data: null })
    const history = [...(flow.approvalHistory || [])]
    history.push({ step: flow.currentStep || '', approver: body.approver, result: 'rejected', comment: body.comment, time: new Date().toISOString() })
    const updated = await FlowsDb.update(id, {
      status: 'rejected', currentStep: 'rejected',
      approveTime: new Date().toISOString(), approveComment: body.comment,
      approvalHistory: history,
    })
    if (!updated) return HttpResponse.json({ code: 40401, message: '流程不存在', data: null })
    return HttpResponse.json({ code: 200, message: '已驳回', data: updated })
  }),
]
