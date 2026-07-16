<template>
  <div class="outbound-query">
    <!-- 搜索面板 -->
    <div class="search-panel">
      <el-form :model="form" inline>
        <el-form-item label="物料名称/编号"><el-input v-model="form.material" placeholder="请输入关键词" clearable /></el-form-item>
        <el-form-item label="项目编号/PO号"><el-input v-model="form.project" placeholder="请输入关键词" clearable /></el-form-item>
        <el-form-item label="仓库">
          <el-select v-model="form.warehouse" placeholder="全部仓库" clearable>
            <el-option v-for="w in warehouseList" :key="w.name" :label="'仓库 ' + w.name" :value="w.name" />
          </el-select>
        </el-form-item>
        <el-form-item label="出库日期">
          <el-date-picker v-model="form.dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" />
        </el-form-item>
      </el-form>
      <div class="search-actions">
        <el-button type="primary" @click="doSearch"><el-icon><Search /></el-icon> 查询</el-button>
        <el-button @click="resetSearch"><el-icon><RefreshLeft /></el-icon> 重置</el-button>
        <el-button @click="doExport"><el-icon><Download /></el-icon> 导出</el-button>
      </div>
    </div>

    <!-- 结果表格 -->
    <el-table :data="tableData" border stripe size="small" max-height="520">
      <el-table-column prop="flowNo" label="出库单号" width="140" />
      <el-table-column label="物料名称" min-width="120" show-overflow-tooltip><template #default="{ row }">{{ row.itemName || '-' }}</template></el-table-column>
      <el-table-column label="物料编号" width="100"><template #default="{ row }">{{ row.itemCode || '-' }}</template></el-table-column>
      <el-table-column label="项目编号" width="100"><template #default="{ row }">{{ row.projectCode || '-' }}</template></el-table-column>
      <el-table-column label="出库类型" width="90">
        <template #default="{ row }">
          <el-tag :type="row.flowType === 'outbound_scrap' ? 'warning' : 'primary'" size="small">{{ row.flowType === 'outbound_scrap' ? '报废' : '领用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="数量" width="60"><template #default="{ row }">{{ row.quantity || '-' }}</template></el-table-column>
      <el-table-column label="单位" width="50"><template #default="{ row }">{{ row.unit || 'PCS' }}</template></el-table-column>
      <el-table-column label="仓库" width="60"><template #default="{ row }">{{ row.warehouse || '-' }}</template></el-table-column>
      <el-table-column prop="createTime" label="出库时间" width="160"><template #default="{ row }">{{ formatDateTime(row.createTime) }}</template></el-table-column>
      <el-table-column prop="creator" label="申请人" width="80" />
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)" size="small">{{ statusText(row.status) }}</el-tag>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getFlowList, getWarehouses } from '@/api/query.api'
import { exportToExcel } from '@/utils/export'

interface OutboundRow {
  flowNo: string; flowType: string; createTime: string; creator: string; status: string
  itemName: string; itemCode: string; projectCode: string; quantity: number | string; unit: string; warehouse: string
}

const form = reactive({ material: '', project: '', warehouse: '', dateRange: null as [string, string] | null })
const tableData = ref<OutboundRow[]>([])
const allRows = ref<OutboundRow[]>([])
const warehouseList = ref<any[]>([])

function formatDateTime(iso: string) { return iso ? new Date(iso).toLocaleString('zh-CN') : '-' }
function statusText(s: string) { return ({ pending: '待处理', approving: '审批中', approved: '已通过', rejected: '已驳回', completed: '已完成' } as Record<string, string>)[s] || s }
function statusType(s: string) { return ({ pending: 'info', approving: 'warning', approved: 'success', rejected: 'danger', completed: 'success' } as const)[s] || 'info' }

async function loadData() {
  try {
    const [flowRes, whRes] = await Promise.all([getFlowList(), getWarehouses()])
    warehouseList.value = whRes.data.list
    allRows.value = flowRes.data.list
      .filter((f: any) => f.type === 'outbound_request' || f.type === 'outbound_scrap')
      .map((f: any) => {
        const items = f.data?.items || (f.data ? [f.data] : [])
        const item = items[0] || {}
        return {
          flowNo: f.flowNo, flowType: f.type, createTime: f.createTime, creator: f.creator, status: f.status,
          itemName: item.materialName || '-', itemCode: item.materialCode || '-',
          projectCode: item.projectCode || f.data?.projectCode || '-',
          quantity: item.quantity || f.data?.quantity || '-',
          unit: item.unit || f.data?.unit || 'PCS', warehouse: item.warehouse || f.data?.warehouse || '-',
        }
      })
    doSearch()
  } catch { /* empty */ }
}

function doSearch() {
  let data = allRows.value
  if (form.material) {
    const kw = form.material.toLowerCase()
    data = data.filter(r => (r.itemName || '').toLowerCase().includes(kw) || (r.itemCode || '').toLowerCase().includes(kw))
  }
  if (form.project) {
    const kw = form.project.toLowerCase()
    data = data.filter(r => (r.projectCode || '').toLowerCase().includes(kw))
  }
  if (form.warehouse) data = data.filter(r => r.warehouse === form.warehouse)
  if (form.dateRange) {
    const [start, end] = form.dateRange
    data = data.filter(r => {
      const t = new Date(r.createTime)
      return t >= new Date(start) && t <= new Date(end + ' 23:59:59')
    })
  }
  tableData.value = data
}

function resetSearch() {
  Object.assign(form, { material: '', project: '', warehouse: '', dateRange: null })
  doSearch()
}

function doExport() {
  const headers = ['出库单号','物料名称','物料编号','项目编号','出库类型','数量','单位','仓库','出库时间','申请人','状态']
  const rows = tableData.value.map(r => [r.flowNo, r.itemName, r.itemCode, r.projectCode, r.flowType === 'outbound_scrap' ? '报废' : '领用', r.quantity, r.unit, r.warehouse, formatDateTime(r.createTime), r.creator, statusText(r.status)])
  exportToExcel('出库查询', headers, rows, '出库')
  ElMessage.success('导出成功')
}

onMounted(loadData)
</script>

<style scoped>
.search-panel { background: #fff; padding: 16px; border-radius: 8px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
.search-actions { display: flex; gap: 8px; margin-top: 8px; padding-top: 12px; border-top: 1px solid #f0f0f0; }
</style>
