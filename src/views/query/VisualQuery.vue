<template>
  <div class="visual-query">
    <!-- 统计卡片行 -->
    <el-row :gutter="16" class="stat-row">
      <el-col :xs="12" :sm="6">
        <div class="stat-card"><div class="stat-icon blue"><el-icon :size="24"><Box /></el-icon></div><div class="stat-info"><div class="stat-label">物料总数</div><div class="stat-value">{{ stats.total }}</div></div></div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card"><div class="stat-icon green"><el-icon :size="24"><Goods /></el-icon></div><div class="stat-info"><div class="stat-label">库存总量</div><div class="stat-value">{{ stats.stock.toLocaleString() }}</div></div></div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card"><div class="stat-icon orange"><el-icon :size="24"><OfficeBuilding /></el-icon></div><div class="stat-info"><div class="stat-label">仓库总数</div><div class="stat-value">{{ stats.warehouses }}</div></div></div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card"><div class="stat-icon red"><el-icon :size="24"><Location /></el-icon></div><div class="stat-info"><div class="stat-label">库位总数</div><div class="stat-value">{{ stats.locations }}</div></div></div>
      </el-col>
    </el-row>

    <!-- 预警摘要卡片行 -->
    <el-row :gutter="16" class="alert-row">
      <el-col :xs="12" :sm="8">
        <div class="alert-card red">
          <div class="alert-icon"><el-icon :size="28"><CircleCloseFilled /></el-icon></div>
          <div class="alert-info"><div class="alert-label">安全库存预警</div><div class="alert-value">{{ alerts.safety }} 项</div></div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="8">
        <div class="alert-card orange">
          <div class="alert-icon"><el-icon :size="28"><Clock /></el-icon></div>
          <div class="alert-info"><div class="alert-label">账龄超期（>90天）</div><div class="alert-value">{{ alerts.aging }} 项</div></div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="8">
        <div class="alert-card yellow">
          <div class="alert-icon"><el-icon :size="28"><WarningFilled /></el-icon></div>
          <div class="alert-info"><div class="alert-label">呆滞超期（>180天）</div><div class="alert-value">{{ alerts.dormant }} 项</div></div>
        </div>
      </el-col>
    </el-row>

    <!-- 仓库容量一览表 -->
    <div class="table-panel">
      <h3 class="table-title"><el-icon><OfficeBuilding /></el-icon> 仓库容量一览</h3>
      <el-table :data="warehouseOverview" border stripe size="small">
        <el-table-column prop="name" label="仓库名称" width="120" />
        <el-table-column prop="locCount" label="库位数量" width="100" />
        <el-table-column prop="itemCount" label="库存条目数" width="110" />
        <el-table-column prop="stockSum" label="库存总量" width="100"><template #default="{ row }">{{ row.stockSum.toLocaleString() }}</template></el-table-column>
        <el-table-column label="占比" min-width="160">
          <template #default="{ row }">
            <div class="progress-bar"><div class="progress-fill" :style="{ width: Math.max(row.percent, 5) + '%' }">{{ row.percent }}%</div></div>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { getInventoryList, getWarehouses, getLocations } from '@/api/query.api'
import type { InventoryItem } from '@/api/inventory.api'

const stats = reactive({ total: 0, stock: 0, warehouses: 0, locations: 0 })
const alerts = reactive({ safety: 0, aging: 0, dormant: 0 })

interface WhRow { name: string; locCount: number; itemCount: number; stockSum: number; percent: number }
const warehouseOverview = ref<WhRow[]>([])

async function loadData() {
  try {
    const [invRes, whRes, locRes] = await Promise.all([getInventoryList(), getWarehouses(), getLocations()])
    const inventory: InventoryItem[] = invRes.data.list
    const warehouses = whRes.data.list
    const locations = locRes.data.list

    stats.total = inventory.length
    stats.stock = inventory.reduce((s, i) => s + i.remainingStock, 0)
    stats.warehouses = warehouses.length
    stats.locations = locations.length

    alerts.safety = inventory.filter(i => i.remainingStock <= 10).length
    alerts.aging = inventory.filter(i => i.agingDays > 90).length
    alerts.dormant = inventory.filter(i => i.dormantDays > 180).length

    const totalStock = stats.stock
    warehouseOverview.value = warehouses.map((w: any) => {
      const locCount = locations.filter((l: any) => l.warehouseName === w.name).length
      const wInv = inventory.filter(i => i.warehouse === w.name)
      const stockSum = wInv.reduce((s, i) => s + i.remainingStock, 0)
      const percent = totalStock > 0 ? Math.round(stockSum / totalStock * 100) : 0
      return { name: '仓库 ' + w.name, locCount, itemCount: wInv.length, stockSum, percent }
    })
  } catch { /* empty */ }
}

onMounted(loadData)
</script>

<style scoped>
.stat-row { margin-bottom: 12px; }
.stat-card { display: flex; align-items: center; gap: 12px; background: #fff; padding: 16px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
.stat-icon { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #fff; flex-shrink: 0; }
.stat-icon.blue { background: #409EFF; }
.stat-icon.green { background: #67C23A; }
.stat-icon.orange { background: #E6A23C; }
.stat-icon.red { background: #F56C6C; }
.stat-label { font-size: 12px; color: #909399; }
.stat-value { font-size: 20px; font-weight: 700; color: #303133; }
.alert-row { margin-bottom: 12px; }
.alert-card { display: flex; align-items: center; gap: 16px; padding: 20px; border-radius: 8px; }
.alert-card.red { background: #fef0f0; }
.alert-card.red .alert-icon { color: #F56C6C; }
.alert-card.orange { background: #fdf6ec; }
.alert-card.orange .alert-icon { color: #E6A23C; }
.alert-card.yellow { background: #fdf6ec; }
.alert-card.yellow .alert-icon { color: #E6A23C; }
.alert-label { font-size: 13px; color: #909399; }
.alert-value { font-size: 18px; font-weight: 700; color: #303133; }
.table-panel { background: #fff; padding: 16px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
.table-title { font-size: 14px; font-weight: 600; color: #303133; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
.table-title .el-icon { color: #00A3E0; }
.progress-bar { background: #f0f0f0; border-radius: 10px; height: 22px; overflow: hidden; }
.progress-fill { background: #00A3E0; color: #fff; font-size: 12px; line-height: 22px; text-align: center; border-radius: 10px; min-width: 30px; }
</style>
