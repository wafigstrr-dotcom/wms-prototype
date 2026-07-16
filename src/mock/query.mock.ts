import { http, HttpResponse } from 'msw'
import { InventoryDb, FlowsDb } from './db'

export const queryHandlers = [
  http.get('/api/v1/query/material-history', async ({ request }) => {
    const url = new URL(request.url)
    const code = (url.searchParams.get('code') || '').trim()
    if (!code) {
      return HttpResponse.json({ code: 40001, message: '请输入物料编号', data: null })
    }

    type HistoryRecord = {
      type: string; time: string; flowNo: string; name: string
      quantity: number | string; warehouse: string; location: string
      operator: string; status: string
    }
    const records: HistoryRecord[] = []

    // 1. 入库记录（来自 Inventory）
    const inventory = await InventoryDb.getAll()
    inventory
      .filter(item => item.materialCode === code)
      .forEach(item => {
        records.push({
          type: '入库',
          time: item.inboundTime,
          flowNo: item.inboundNo || '-',
          name: item.materialName,
          quantity: item.quantity,
          warehouse: item.warehouse || '-',
          location: item.location || '-',
          operator: item.owner || '-',
          status: '已入库',
        })
      })

    // 2. 流程记录（来自 Flows）
    const typeMap: Record<string, string> = {
      outbound_request: '领用出库', outbound_scrap: '报废出库',
      transfer: '移库', inbound_engineer: '工程师入库', scrap_workflow: '报废流程',
    }
    const statusMap: Record<string, string> = {
      pending: '待审批', approving: '审批中', approved: '已通过',
      rejected: '已驳回', completed: '已完成',
    }

    const flows = await FlowsDb.getAll()
    flows.forEach(flow => {
      const items = flow.data && (flow.data as any).items
        ? (flow.data as any).items
        : flow.data
          ? [flow.data]
          : []
      items.forEach((item: any) => {
        const itemCode = item.materialCode || item.code || ''
        if (itemCode !== code) return
        records.push({
          type: typeMap[flow.type] || flow.type || '其他',
          time: flow.createTime,
          flowNo: flow.flowNo || '-',
          name: item.materialName || item.name || '-',
          quantity: item.quantity || item.requestQty || '-',
          warehouse: item.warehouse || item.fromWarehouse || '-',
          location: item.location || item.fromLocation || '-',
          operator: flow.creator || '-',
          status: statusMap[flow.status] || flow.status || '-',
        })
      })
    })

    records.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    return HttpResponse.json({ code: 200, message: '查询成功', data: { list: records, total: records.length, page: 1, pageSize: records.length } })
  }),
]
