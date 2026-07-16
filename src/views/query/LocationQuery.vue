<template>
  <div class="location-query">
    <div class="search-panel">
      <el-form :model="form" inline>
        <el-form-item label="仓库">
          <el-select v-model="form.warehouse" placeholder="全部仓库" clearable>
            <el-option v-for="w in warehouseList" :key="w.name" :label="'仓库 ' + w.name" :value="w.name" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词"><el-input v-model="form.keyword" placeholder="库位编号或负责人" clearable /></el-form-item>
      </el-form>
      <div class="search-actions">
        <el-button type="primary" @click="doSearch"><el-icon><Search /></el-icon> 查询</el-button>
        <el-button @click="resetSearch"><el-icon><RefreshLeft /></el-icon> 重置</el-button>
        <el-button @click="doExport"><el-icon><Download /></el-icon> 导出</el-button>
      </div>
    </div>

    <el-table :data="tableData" border stripe size="small" max-height="520">
      <el-table-column label="仓库名称" width="120"><template #default="{ row }">仓库 {{ row.warehouseName }}</template></el-table-column>
      <el-table-column prop="locationCode" label="库位编号" width="120" />
      <el-table-column prop="manager" label="负责人员" width="100" />
      <el-table-column prop="size" label="库位尺寸" width="100"><template #default="{ row }">{{ row.size || '-' }}</template></el-table-column>
      <el-table-column label="创建时间" width="120"><template #default="{ row }">{{ formatDate(row.createTime) }}</template></el-table-column>
      <el-table-column label="库存条目数" width="110"><template #default="{ row }">{{ row.itemCount }}</template></el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getInventoryList, getWarehouses, getLocations } from '@/api/query.api'
import { exportToExcel } from '@/utils/export'

interface LocRow { warehouseName: string; locationCode: string; manager: string; size: string; createTime: string; itemCount: number }

const form = reactive({ warehouse: '', keyword: '' })
const tableData = ref<LocRow[]>([])
const allRows = ref<LocRow[]>([])
const warehouseList = ref<any[]>([])

function formatDate(iso: string) { return iso ? new Date(iso).toLocaleDateString('zh-CN') : '-' }

async function loadData() {
  try {
    const [invRes, whRes, locRes] = await Promise.all([getInventoryList(), getWarehouses(), getLocations()])
    warehouseList.value = whRes.data.list
    const inventory = invRes.data.list
    allRows.value = locRes.data.list.map((l: any) => ({
      warehouseName: l.warehouseName,
      locationCode: l.locationCode,
      manager: l.manager,
      size: l.size || '-',
      createTime: l.createTime,
      itemCount: inventory.filter((i: any) => i.location === l.locationCode).length,
    }))
    doSearch()
  } catch { /* empty */ }
}

function doSearch() {
  let data = allRows.value
  if (form.warehouse) data = data.filter(r => r.warehouseName === form.warehouse)
  if (form.keyword) {
    const kw = form.keyword.toLowerCase()
    data = data.filter(r => (r.locationCode || '').toLowerCase().includes(kw) || (r.manager || '').toLowerCase().includes(kw))
  }
  tableData.value = data
}

function resetSearch() {
  Object.assign(form, { warehouse: '', keyword: '' })
  doSearch()
}

function doExport() {
  const headers = ['仓库名称','库位编号','负责人员','库位尺寸','创建时间','库存条目数']
  const rows = tableData.value.map(r => ['仓库 ' + r.warehouseName, r.locationCode, r.manager, r.size, formatDate(r.createTime), r.itemCount])
  exportToExcel('库位查询', headers, rows, '库位')
  ElMessage.success('导出成功')
}

onMounted(loadData)
</script>

<style scoped>
.search-panel { background: #fff; padding: 16px; border-radius: 8px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
.search-actions { display: flex; gap: 8px; margin-top: 8px; padding-top: 12px; border-top: 1px solid #f0f0f0; }
</style>
