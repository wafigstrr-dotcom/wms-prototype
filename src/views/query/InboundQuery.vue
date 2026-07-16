<template>
  <div class="inbound-query">
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
        <el-form-item label="入库日期">
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
      <el-table-column prop="inboundNo" label="入库单号" width="140" />
      <el-table-column prop="materialName" label="物料名称" min-width="120" show-overflow-tooltip />
      <el-table-column prop="materialCode" label="物料编号" width="100"><template #default="{ row }">{{ row.materialCode || '-' }}</template></el-table-column>
      <el-table-column prop="projectCode" label="项目编号" width="100" />
      <el-table-column prop="pbu" label="PBU" width="70" />
      <el-table-column prop="materialCategory" label="物料类别" width="90"><template #default="{ row }"><el-tag size="small">{{ row.materialCategory }}</el-tag></template></el-table-column>
      <el-table-column prop="quantity" label="数量" width="60" />
      <el-table-column prop="unit" label="单位" width="50" />
      <el-table-column prop="warehouse" label="仓库" width="60" />
      <el-table-column prop="location" label="货位" width="70" />
      <el-table-column prop="inboundTime" label="入库时间" width="160"><template #default="{ row }">{{ formatDateTime(row.inboundTime) }}</template></el-table-column>
      <el-table-column prop="owner" label="申请人" width="80" />
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getInventoryList, getWarehouses } from '@/api/query.api'
import type { InventoryItem } from '@/api/inventory.api'
import { exportToExcel } from '@/utils/export'

const form = reactive({ material: '', project: '', warehouse: '', dateRange: null as [string, string] | null })
const tableData = ref<InventoryItem[]>([])
const allData = ref<InventoryItem[]>([])
const warehouseList = ref<any[]>([])

function formatDateTime(iso: string) { return iso ? new Date(iso).toLocaleString('zh-CN') : '-' }

async function loadData() {
  try {
    const [invRes, whRes] = await Promise.all([getInventoryList(), getWarehouses()])
    allData.value = invRes.data.list
    warehouseList.value = whRes.data.list
    doSearch()
  } catch { /* empty */ }
}

function doSearch() {
  let data = allData.value
  if (form.material) {
    const kw = form.material.toLowerCase()
    data = data.filter(i => i.materialName.toLowerCase().includes(kw) || (i.materialCode && i.materialCode.toLowerCase().includes(kw)))
  }
  if (form.project) {
    const kw = form.project.toLowerCase()
    data = data.filter(i => i.projectCode.toLowerCase().includes(kw) || i.poNumber.toLowerCase().includes(kw))
  }
  if (form.warehouse) data = data.filter(i => i.warehouse === form.warehouse)
  if (form.dateRange) {
    const [start, end] = form.dateRange
    data = data.filter(i => {
      const t = new Date(i.inboundTime)
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
  const headers = ['入库单号','物料名称','物料编号','项目编号','PBU','物料类别','数量','单位','仓库','货位','入库时间','申请人']
  const rows = tableData.value.map(i => [i.inboundNo, i.materialName, i.materialCode || '-', i.projectCode, i.pbu, i.materialCategory, i.quantity, i.unit, i.warehouse, i.location, formatDateTime(i.inboundTime), i.owner])
  exportToExcel('入库查询', headers, rows, '入库')
  ElMessage.success('导出成功')
}

onMounted(loadData)
</script>

<style scoped>
.search-panel { background: #fff; padding: 16px; border-radius: 8px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
.search-actions { display: flex; gap: 8px; margin-top: 8px; padding-top: 12px; border-top: 1px solid #f0f0f0; }
</style>
