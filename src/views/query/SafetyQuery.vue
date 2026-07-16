<template>
  <div class="safety-query">
    <div class="search-panel">
      <el-form :model="form" inline>
        <el-form-item label="安全阈值">
          <el-select v-model="form.threshold">
            <el-option :value="5" label="≤5" />
            <el-option :value="10" label="≤10" />
            <el-option :value="20" label="≤20" />
            <el-option :value="50" label="≤50" />
          </el-select>
        </el-form-item>
        <el-form-item label="仓库">
          <el-select v-model="form.warehouse" placeholder="全部仓库" clearable>
            <el-option v-for="w in warehouseList" :key="w.name" :label="'仓库 ' + w.name" :value="w.name" />
          </el-select>
        </el-form-item>
        <el-form-item label="物料类别">
          <el-select v-model="form.category" placeholder="全部类别" clearable>
            <el-option v-for="c in MATERIAL_CATEGORIES" :key="c" :label="c" :value="c" />
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
      <el-table-column prop="materialCategory" label="物料类别" width="90"><template #default="{ row }"><el-tag size="small">{{ row.materialCategory }}</el-tag></template></el-table-column>
      <el-table-column prop="remainingStock" label="剩余库存" width="90">
        <template #default="{ row }">
          <span :class="row.remainingStock === 0 ? 'text-danger' : 'text-warning'">{{ row.remainingStock }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="unit" label="单位" width="50" />
      <el-table-column prop="warehouse" label="仓库" width="60" />
      <el-table-column prop="location" label="货位" width="70" />
      <el-table-column prop="owner" label="所属人" width="80" />
      <el-table-column label="入库时间" width="110"><template #default="{ row }">{{ formatDate(row.inboundTime) }}</template></el-table-column>
      <el-table-column prop="projectCode" label="项目编号" width="100" />
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getInventoryList, getWarehouses } from '@/api/query.api'
import type { InventoryItem } from '@/api/inventory.api'
import { exportToExcel, MATERIAL_CATEGORIES } from '@/utils/export'

const form = reactive({ threshold: 10, warehouse: '', category: '' })
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
  let data = allData.value.filter(i => i.remainingStock <= form.threshold)
  if (form.warehouse) data = data.filter(i => i.warehouse === form.warehouse)
  if (form.category) data = data.filter(i => i.materialCategory === form.category)
  data.sort((a, b) => a.remainingStock - b.remainingStock)
  tableData.value = data
}

function resetSearch() {
  Object.assign(form, { threshold: 10, warehouse: '', category: '' })
  doSearch()
}

function doExport() {
  const headers = ['物料名称','物料编号','物料类别','剩余库存','单位','仓库','货位','所属人','入库时间','项目编号']
  const rows = tableData.value.map(i => [i.materialName, i.materialCode || '-', i.materialCategory, i.remainingStock, i.unit, i.warehouse, i.location, i.owner, formatDate(i.inboundTime), i.projectCode])
  exportToExcel('安全库存预警', headers, rows, '预警')
  ElMessage.success('导出成功')
}

onMounted(loadData)
</script>

<style scoped>
.search-panel { background: #fff; padding: 16px; border-radius: 8px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
.search-actions { display: flex; gap: 8px; margin-top: 8px; padding-top: 12px; border-top: 1px solid #f0f0f0; }
.text-danger { color: #F56C6C; font-weight: 600; }
.text-warning { color: #E6A23C; font-weight: 600; }
</style>
