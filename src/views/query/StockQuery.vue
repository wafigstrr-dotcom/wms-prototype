<template>
  <div class="stock-query">
    <!-- 二维码操作工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-checkbox v-model="checkAll" @change="onCheckAllChange">全选</el-checkbox>
        <span class="selected-count">已选择 <strong>{{ selectedRows.length }}</strong> 板</span>
      </div>
      <div class="toolbar-right">
        <el-button type="primary" :disabled="!selectedRows.length" @click="showQRDialog">
          <el-icon><Grid /></el-icon> 生成二维码
        </el-button>
        <el-button type="success" :disabled="!selectedRows.length" @click="handleBatchPrint">
          <el-icon><Printer /></el-icon> 打印选中标签
        </el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="16" class="stat-row">
      <el-col :xs="12" :sm="6">
        <div class="stat-card"><div class="stat-icon blue"><el-icon :size="24"><Box /></el-icon></div><div class="stat-info"><div class="stat-label">库存种类</div><div class="stat-value">{{ stats.types }}</div></div></div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card"><div class="stat-icon green"><el-icon :size="24"><Goods /></el-icon></div><div class="stat-info"><div class="stat-label">库存总量</div><div class="stat-value">{{ stats.total.toLocaleString() }}</div></div></div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card"><div class="stat-icon orange"><el-icon :size="24"><OfficeBuilding /></el-icon></div><div class="stat-info"><div class="stat-label">涉及仓库</div><div class="stat-value">{{ stats.warehouses }}</div></div></div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card"><div class="stat-icon red"><el-icon :size="24"><Coin /></el-icon></div><div class="stat-info"><div class="stat-label">库存总值</div><div class="stat-value">{{ statsValueDisplay }}</div></div></div>
      </el-col>
    </el-row>

    <!-- 搜索面板 -->
    <div class="search-panel">
      <el-form :model="form" inline>
        <el-form-item label="物料名称"><el-input v-model="form.name" placeholder="请输入物料名称" clearable /></el-form-item>
        <el-form-item label="物料编号"><el-input v-model="form.code" placeholder="请输入物料编号" clearable /></el-form-item>
        <el-form-item label="项目编号"><el-input v-model="form.project" placeholder="请输入项目编号" clearable /></el-form-item>
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

    <!-- 结果表格 -->
    <el-table :data="tableData" border stripe size="small" max-height="520" @selection-change="onSelectionChange">
      <el-table-column type="selection" width="40" />
      <el-table-column prop="materialName" label="物料名称" min-width="120" show-overflow-tooltip />
      <el-table-column prop="materialCode" label="物料编号" width="100"><template #default="{ row }">{{ row.materialCode || '-' }}</template></el-table-column>
      <el-table-column prop="applicant" label="申请人" width="80" />
      <el-table-column prop="projectCode" label="项目编号" width="100" />
      <el-table-column prop="pbu" label="PBU" width="70" />
      <el-table-column prop="exempt3C" label="免3C" width="60" />
      <el-table-column prop="materialCategory" label="物料类别" width="90"><template #default="{ row }"><el-tag size="small">{{ row.materialCategory }}</el-tag></template></el-table-column>
      <el-table-column prop="owner" label="所属人" width="80" />
      <el-table-column prop="department" label="所属部门" width="100" />
      <el-table-column prop="poNumber" label="PO号" width="90" />
      <el-table-column prop="supplierCode" label="供应商编号" width="100"><template #default="{ row }">{{ row.supplierCode || '-' }}</template></el-table-column>
      <el-table-column prop="quantity" label="数量" width="60" />
      <el-table-column prop="unit" label="单位" width="50" />
      <el-table-column prop="inboundTime" label="入库时间" width="110"><template #default="{ row }">{{ formatDate(row.inboundTime) }}</template></el-table-column>
      <el-table-column prop="inboundNo" label="入库单号" width="130" />
      <el-table-column prop="remainingStock" label="剩余库存" width="80"><template #default="{ row }"><span :class="{ 'text-danger': row.remainingStock < 10 }">{{ row.remainingStock }}</span></template></el-table-column>
      <el-table-column label="可用库存" width="80"><template #default="{ row }"><span :class="{ 'text-danger': availableOf(row) <= 0, 'text-available': availableOf(row) > 0 }">{{ availableOf(row) }}</span><el-tooltip v-if="lockedOf(row) > 0" :content="`被出库流程锁定 ${lockedOf(row)} 件`" placement="top"><span class="lock-mark"> 🔒</span></el-tooltip></template></el-table-column>
      <el-table-column prop="agingDays" label="账龄周期" width="80"><template #default="{ row }"><span :class="{ 'text-warning': row.agingDays > 90 }">{{ row.agingDays }}天</span></template></el-table-column>
      <el-table-column prop="dormantDays" label="呆滞周期" width="80"><template #default="{ row }"><span :class="{ 'text-danger': row.dormantDays > 90 }">{{ row.dormantDays }}天</span></template></el-table-column>
      <el-table-column prop="warehouse" label="仓库" width="60" />
      <el-table-column prop="location" label="货位" width="70" />
      <el-table-column label="操作" width="70" fixed="right"><template #default="{ row }"><el-button size="small" text type="primary" @click="handleSinglePrint(row)"><el-icon><Printer /></el-icon></el-button></template></el-table-column>
    </el-table>

    <!-- 二维码预览弹窗 -->
    <el-dialog v-model="qrDialogVisible" title="二维码预览" width="720px" destroy-on-close>
      <div class="qr-preview-grid">
        <QRLabel
          v-for="(item, idx) in qrPreviewItems"
          :key="idx"
          :item="item"
          :template="template"
          :max-size="120"
        />
      </div>
      <template #footer>
        <el-button @click="qrDialogVisible = false">关闭</el-button>
        <el-button type="success" @click="handleDialogPrint">
          <el-icon><Printer /></el-icon> 打印全部
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getInventoryList, getWarehouses } from '@/api/query.api'
import { getLockedStock } from '@/api/outbound.api'
import type { InventoryItem } from '@/api/inventory.api'
import { exportToExcel, MATERIAL_CATEGORIES } from '@/utils/export'
import QRLabel from '@/views/qrcode/QRLabel.vue'
import { printLabels } from '@/views/qrcode/usePrintLabels'
import { loadTemplate, type QRItem, type PrintTemplate } from '@/views/qrcode/templateConfig'

const form = reactive({ name: '', code: '', project: '', warehouse: '', category: '' })
const tableData = ref<InventoryItem[]>([])
const allData = ref<InventoryItem[]>([])
const warehouseList = ref<any[]>([])
const selectedRows = ref<InventoryItem[]>([])
const checkAll = ref(false)
const stats = reactive({ types: 0, total: 0, warehouses: 0, value: 0 })
// 出库流程锁定量（pending/approving 的领用+报废）: key = inboundNo
const lockedMap = ref<Record<string, number>>({})

function lockedOf(item: unknown): number {
  const row = item as InventoryItem
  return lockedMap.value[row.inboundNo] || 0
}

// 可用库存 = 剩余库存 − 流程锁定（与出库页口径一致）
function availableOf(item: unknown): number {
  const row = item as InventoryItem
  return Math.max(0, row.remainingStock - lockedOf(row))
}

const statsValueDisplay = computed(() => '¥' + (stats.value / 10000).toFixed(1) + '万')

function formatDate(iso: string) { return iso ? new Date(iso).toLocaleDateString('zh-CN') : '-' }

async function loadData() {
  try {
    const [invRes, whRes, lockedRes] = await Promise.all([getInventoryList(), getWarehouses(), getLockedStock()])
    allData.value = invRes.data.list
    warehouseList.value = whRes.data.list
    lockedMap.value = lockedRes.data || {}
    computeStats()
    doSearch()
  } catch { /* empty */ }
}

function computeStats() {
  const items = allData.value
  stats.types = items.length
  stats.total = items.reduce((s, i) => s + i.remainingStock, 0)
  stats.warehouses = new Set(items.map(i => i.warehouse)).size
  stats.value = items.reduce((s, i) => s + (i.remainingStock * (i.unitPrice || 0)), 0)
}

function doSearch() {
  let data = allData.value
  if (form.name) data = data.filter(i => i.materialName.toLowerCase().includes(form.name.toLowerCase()))
  if (form.code) data = data.filter(i => i.materialCode?.toLowerCase().includes(form.code.toLowerCase()))
  if (form.project) data = data.filter(i => i.projectCode.toLowerCase().includes(form.project.toLowerCase()))
  if (form.warehouse) data = data.filter(i => i.warehouse === form.warehouse)
  if (form.category) data = data.filter(i => i.materialCategory === form.category)
  tableData.value = data
}

function resetSearch() {
  Object.assign(form, { name: '', code: '', project: '', warehouse: '', category: '' })
  doSearch()
}

function onSelectionChange(rows: InventoryItem[]) { selectedRows.value = rows }
function onCheckAllChange() { /* handled by el-table */ }

function doExport() {
  const headers = ['物料名称','物料编号','申请人','项目编号','PBU','免3C','物料类别','所属人','所属部门','PO号','供应商编号','数量','单位','入库时间','入库单号','剩余库存','可用库存','锁定量','账龄周期(天)','呆滞周期(天)','仓库','货位']
  const rows = tableData.value.map(i => [i.materialName, i.materialCode || '-', (i as any).applicant || '-', i.projectCode, i.pbu, i.exempt3C, i.materialCategory, i.owner, i.department, i.poNumber, i.supplierCode, i.quantity, i.unit, formatDate(i.inboundTime), i.inboundNo, i.remainingStock, availableOf(i), lockedOf(i), i.agingDays, i.dormantDays, i.warehouse, i.location])
  exportToExcel('库存查询', headers, rows, '库存')
  ElMessage.success('导出成功')
}

onMounted(loadData)

// 二维码功能
const template = ref<PrintTemplate>(loadTemplate())
const qrDialogVisible = ref(false)
const qrPreviewItems = ref<QRItem[]>([])

function toQRItems(rows: InventoryItem[]): QRItem[] {
  return rows.map(i => ({
    materialName: i.materialName,
    materialCode: i.materialCode,
    owner: i.owner,
    department: i.department,
    warehouse: i.warehouse,
    location: i.location,
  }))
}

function showQRDialog() {
  qrPreviewItems.value = toQRItems(selectedRows.value)
  qrDialogVisible.value = true
}

function handleDialogPrint() {
  qrDialogVisible.value = false
  printLabels(qrPreviewItems.value, template.value)
}

function handleBatchPrint() {
  printLabels(toQRItems(selectedRows.value), template.value)
}

function handleSinglePrint(row: unknown) {
  const item = row as InventoryItem
  printLabels(toQRItems([item]), template.value)
}
</script>

<style scoped>
.toolbar { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #fff; border-radius: 8px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
.toolbar-left { display: flex; align-items: center; gap: 12px; }
.selected-count { color: #909399; font-size: 13px; }
.selected-count strong { color: #00A3E0; }
.toolbar-right { display: flex; gap: 8px; }
.stat-row { margin-bottom: 12px; }
.stat-card { display: flex; align-items: center; gap: 12px; background: #fff; padding: 16px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
.stat-icon { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #fff; flex-shrink: 0; }
.stat-icon.blue { background: #409EFF; }
.stat-icon.green { background: #67C23A; }
.stat-icon.orange { background: #E6A23C; }
.stat-icon.red { background: #F56C6C; }
.stat-label { font-size: 12px; color: #909399; }
.stat-value { font-size: 20px; font-weight: 700; color: #303133; }
.search-panel { background: #fff; padding: 16px; border-radius: 8px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
.search-actions { display: flex; gap: 8px; margin-top: 8px; padding-top: 12px; border-top: 1px solid #f0f0f0; }
.text-danger { color: #F56C6C; font-weight: 600; }
.text-warning { color: #E6A23C; font-weight: 600; }
.text-available { color: #67C23A; font-weight: 600; }
.lock-mark { cursor: help; font-size: 12px; }
.qr-preview-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; max-height: 500px; overflow-y: auto; }
</style>
