<template>
  <div class="history-query">
    <div class="search-panel">
      <el-form :model="form" inline>
        <el-form-item label="物料编号">
          <el-input v-model="form.code" placeholder="输入物料编号（精确匹配）" clearable @keydown.enter="doSearch" />
        </el-form-item>
      </el-form>
      <div class="search-actions">
        <el-button type="primary" @click="doSearch"><el-icon><Search /></el-icon> 查询</el-button>
        <el-button @click="resetSearch"><el-icon><RefreshLeft /></el-icon> 重置</el-button>
        <el-button @click="doExport"><el-icon><Download /></el-icon> 导出</el-button>
      </div>
    </div>

    <el-table :data="tableData" border stripe size="small" max-height="520">
      <el-table-column label="记录类型" width="110">
        <template #default="{ row }">
          <el-tag :type="row.type.includes('入库') ? 'success' : row.type.includes('出库') ? 'warning' : 'primary'" size="small">{{ row.type }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作时间" width="170"><template #default="{ row }">{{ formatDateTime(row.time) }}</template></el-table-column>
      <el-table-column prop="flowNo" label="操作单号" width="140" />
      <el-table-column prop="name" label="物料名称" min-width="120" show-overflow-tooltip />
      <el-table-column prop="quantity" label="操作数量" width="80" />
      <el-table-column prop="warehouse" label="仓库" width="80" />
      <el-table-column prop="location" label="货位" width="80" />
      <el-table-column prop="operator" label="操作人" width="80" />
      <el-table-column prop="status" label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)" size="small">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { getMaterialHistory } from '@/api/query.api'
import type { HistoryRecord } from '@/api/query.api'
import { exportToExcel } from '@/utils/export'

const form = reactive({ code: '' })
const tableData = ref<HistoryRecord[]>([])

function formatDateTime(iso: string) { return iso ? new Date(iso).toLocaleString('zh-CN') : '-' }

type TagType = 'success' | 'danger' | 'warning' | 'info'
function statusType(s: string): TagType {
  if (s.includes('入库') || s === '已通过' || s === '已完成') return 'success'
  if (s === '已驳回') return 'danger'
  if (s === '待审批' || s === '审批中') return 'warning'
  return 'info'
}

async function doSearch() {
  if (!form.code.trim()) {
    ElMessage.warning('请输入物料编号')
    return
  }
  try {
    const res = await getMaterialHistory(form.code.trim())
    tableData.value = res.data.list
    if (!tableData.value.length) ElMessage.info('未找到该物料编号的相关记录')
  } catch { /* empty */ }
}

function resetSearch() {
  form.code = ''
  tableData.value = []
}

function doExport() {
  if (!tableData.value.length) { ElMessage.warning('暂无数据可导出，请先查询'); return }
  const headers = ['记录类型','操作时间','操作单号','物料名称','操作数量','仓库','货位','操作人','状态']
  const rows = tableData.value.map(r => [r.type, formatDateTime(r.time), r.flowNo, r.name, r.quantity, r.warehouse, r.location, r.operator, r.status])
  exportToExcel('物料历史记录-' + form.code, headers, rows, '物料历史')
  ElMessage.success('导出成功')
}
</script>

<style scoped>
.search-panel { background: #fff; padding: 16px; border-radius: 8px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
.search-actions { display: flex; gap: 8px; margin-top: 8px; padding-top: 12px; border-top: 1px solid #f0f0f0; }
</style>
