<template>
  <div class="aging-query">
    <div class="search-panel">
      <el-form :model="form" inline>
        <el-form-item label="初次入库起始日期"><el-date-picker v-model="form.startDate" type="date" placeholder="选择日期" value-format="YYYY-MM-DD" /></el-form-item>
        <el-form-item label="初次入库截止日期"><el-date-picker v-model="form.endDate" type="date" placeholder="选择日期" value-format="YYYY-MM-DD" /></el-form-item>
        <el-form-item label="物料类别">
          <el-select v-model="form.category" placeholder="全部类别" clearable>
            <el-option v-for="c in categories" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item label="仓库">
          <el-select v-model="form.warehouse" placeholder="全部仓库" clearable>
            <el-option v-for="w in warehouseList" :key="w.name" :label="'仓库 ' + w.name" :value="w.name" />
          </el-select>
        </el-form-item>
      </el-form>
      <div class="search-actions">
        <el-button type="primary" @click="doSearch"><el-icon><Search /></el-icon> 查询</el-button>
        <el-button @click="resetSearch"><el-icon><RefreshLeft /></el-icon> 重置</el-button>
        <el-button @click="doExport"><el-icon><Download /></el-icon> 导出</el-button>
      </div>
    </div>

    <el-table :data="tableData" border stripe size="small" max-height="520">
      <el-table-column prop="materialName" label="物料名称" min-width="120" show-overflow-tooltip />
      <el-table-column prop="materialCode" label="物料编号" width="100"><template #default="{ row }">{{ row.materialCode || '-' }}</template></el-table-column>
      <el-table-column prop="projectCode" label="项目编号" width="100" />
      <el-table-column prop="materialCategory" label="物料类别" width="90"><template #default="{ row }"><el-tag size="small">{{ row.materialCategory }}</el-tag></template></el-table-column>
      <el-table-column label="初次入库时间" width="120"><template #default="{ row }">{{ formatDate(row.inboundTime) }}</template></el-table-column>
      <el-table-column prop="agingDays" label="账龄天数" width="90">
        <template #default="{ row }"><span class="text-warning">{{ row.agingDays }}天</span></template>
      </el-table-column>
      <el-table-column prop="remainingStock" label="剩余库存" width="80" />
      <el-table-column prop="warehouse" label="仓库" width="60" />
      <el-table-column prop="location" label="货位" width="70" />
      <el-table-column prop="owner" label="所属人" width="80" />
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getInventoryList, getWarehouses } from '@/api/query.api'
import type { InventoryItem } from '@/api/inventory.api'
import { exportToExcel, MATERIAL_CATEGORIES } from '@/utils/export'

const categories = MATERIAL_CATEGORIES.slice(0, 6) // 6 categories for aging
const form = reactive({ startDate: '', endDate: '', category: '', warehouse: '' })
const tableData = ref<InventoryItem[]>([])
const allData = ref<InventoryItem[]>([])
const warehouseList = ref<any[]>([])

function formatDate(iso: string) { return iso ? new Date(iso).toLocaleDateString('zh-CN') : '-' }

async function loadData() {
  try {
    const [invRes, whRes] = await Promise.all([getInventoryList(), getWarehouses()])
    allData.value = invRes.data.list
    warehouseList.value = whRes.data.list
    doSearch()
  } catch { /* empty */ }
}

function doSearch() {
  let data = [...allData.value]
  if (form.startDate) {
    const start = new Date(form.startDate); start.setHours(0,0,0,0)
    data = data.filter(i => new Date(i.inboundTime) >= start)
  }
  if (form.endDate) {
    const end = new Date(form.endDate); end.setHours(23,59,59,999)
    data = data.filter(i => new Date(i.inboundTime) <= end)
  }
  if (form.category) data = data.filter(i => i.materialCategory === form.category)
  if (form.warehouse) data = data.filter(i => i.warehouse === form.warehouse)
  data.sort((a, b) => b.agingDays - a.agingDays)
  tableData.value = data
}

function resetSearch() {
  Object.assign(form, { startDate: '', endDate: '', category: '', warehouse: '' })
  doSearch()
}

function doExport() {
  const headers = ['物料名称','物料编号','项目编号','物料类别','初次入库时间','账龄天数','剩余库存','仓库','货位','所属人']
  const rows = tableData.value.map(i => [i.materialName, i.materialCode || '-', i.projectCode, i.materialCategory, formatDate(i.inboundTime), i.agingDays + '天', i.remainingStock, i.warehouse, i.location, i.owner])
  exportToExcel('账龄查询', headers, rows, '账龄')
  ElMessage.success('导出成功')
}

onMounted(loadData)
</script>

<style scoped>
.search-panel { background: #fff; padding: 16px; border-radius: 8px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
.search-actions { display: flex; gap: 8px; margin-top: 8px; padding-top: 12px; border-top: 1px solid #f0f0f0; }
.text-warning { color: #E6A23C; font-weight: 600; }
</style>
