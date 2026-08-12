<template>
  <div class="keeper-inbound">
    <!-- 提示信息 -->
    <el-alert
      title="通过PO号检索直接物料维护数据，在子项「入库数量」下拉框中选择数量即视为选中入库（清空即取消），为每项选择仓库和货位后提交，系统生成入库单号并直接写入库存台账（无审批环节）。"
      type="info"
      show-icon
      :closable="false"
      class="keeper-hint"
    />

    <!-- 步骤1：搜索区 -->
    <div class="search-section">
      <div class="search-bar">
        <el-input
          v-model="searchKeyword"
          placeholder="输入PO号搜索直接物料记录（支持模糊匹配）"
          clearable
          class="po-search"
          @keyup.enter="handleSearch"
          @clear="clearSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-button type="primary" :loading="searching" @click="handleSearch">
          <el-icon><Search /></el-icon> 搜索
        </el-button>
      </div>
    </div>

    <!-- 搜索结果 -->
    <div v-loading="searching" class="results-section">
      <div v-if="searchResults.length > 0" class="results-header">
        <span>找到 {{ searchResults.length }} 条匹配记录</span>
      </div>

      <div v-if="!searching && searchResults.length === 0 && hasSearched && !searchFailed" class="empty-results">
        <el-empty description="未找到匹配的直接物料记录" />
      </div>

      <div v-for="record in searchResults" :key="record.id" class="record-card">
        <!-- 主记录信息 -->
        <div class="record-header" @click="toggleExpand(record.id)">
          <div class="record-main-info">
            <span class="po-tag">{{ record.poNo }}</span>
            <span class="record-field">{{ record.purchaseDescription }}</span>
            <span class="record-field">供应商: {{ record.supplierName || record.supplierCode }}</span>
            <span class="record-field">数量: {{ record.quantity }}</span>
            <span class="record-field">下单: {{ record.orderDate }}</span>
          </div>
          <el-icon class="expand-icon" :class="{ 'is-expanded': expandedIds.has(record.id) }">
            <ArrowRight />
          </el-icon>
        </div>

        <!-- 子项表格 -->
        <div v-if="expandedIds.has(record.id)" class="sub-items-section" v-loading="subLoading[record.id]">
          <el-table :data="subItemsMap[record.id] || []" size="small" border class="sub-table">
            <el-table-column prop="sapDrawingNo" label="SAP号/图号" min-width="140" />
            <el-table-column prop="purchaseDescription" label="物料名称" min-width="200" show-overflow-tooltip />
            <el-table-column prop="quantity" label="原始数量" width="100" align="center" />
            <el-table-column label="入库数量（选择即入库）" width="160" align="center">
              <template #default="{ row: sub }">
                <el-select
                  v-model="inboundQtyMap[`${record.id}-${sub.id}`]"
                  placeholder="不入库"
                  clearable
                  size="small"
                  class="qty-select"
                >
                  <el-option v-for="n in qtyOptions(sub.quantity)" :key="n" :label="String(n)" :value="n" />
                </el-select>
              </template>
            </el-table-column>
            <template #empty>
              <el-empty description="该PO记录暂无子项" :image-size="60" />
            </template>
          </el-table>
        </div>
      </div>
    </div>

    <!-- 步骤2：已选汇总 + 仓库货位 -->
    <div v-if="selectedItems.length > 0" class="selection-summary">
      <div class="summary-header">
        <div class="summary-title">
          <el-icon><Checked /></el-icon>
          已选 {{ selectedItems.length }} 项待入库（请为每项选择仓库和货位）
        </div>
        <el-button type="danger" size="small" text @click="clearAllSelections">
          <el-icon><Delete /></el-icon> 清空选择
        </el-button>
      </div>

      <el-table :data="selectedItems" border size="small" class="items-table">
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="poNo" label="PO号" width="130">
          <template #default="{ row }"><span class="po-tag">{{ row.poNo }}</span></template>
        </el-table-column>
        <el-table-column prop="materialName" label="物料名称" min-width="180" show-overflow-tooltip />
        <el-table-column prop="sapDrawingNo" label="SAP号" width="130" />
        <el-table-column label="入库数量" width="110" align="center">
          <template #default="{ row }">
            <el-select
              v-model="inboundQtyMap[`${row.parentId}-${row.subItemId}`]"
              placeholder="不入库"
              clearable
              size="small"
              class="qty-select-small"
            >
              <el-option v-for="n in qtyOptions(row.originalQty)" :key="n" :label="String(n)" :value="n" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="仓库" width="160">
          <template #default="{ row }">
            <el-select
              v-model="itemWarehouse[`${row.parentId}-${row.subItemId}`]"
              placeholder="请选择仓库"
              size="small"
              class="full-width"
              @change="(val: string) => onWarehouseChange(`${row.parentId}-${row.subItemId}`, val)"
            >
              <el-option v-for="wh in warehouseOptions" :key="wh.id" :label="wh.name" :value="wh.name" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="货位" width="160">
          <template #default="{ row }">
            <el-select
              v-model="itemLocation[`${row.parentId}-${row.subItemId}`]"
              :disabled="!itemWarehouse[`${row.parentId}-${row.subItemId}`]"
              :placeholder="itemWarehouse[`${row.parentId}-${row.subItemId}`] ? '请选择货位' : '先选仓库'"
              size="small"
              class="full-width"
            >
              <el-option v-for="loc in getLocationOptions(`${row.parentId}-${row.subItemId}`)" :key="loc" :label="loc" :value="loc" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="70" align="center">
          <template #default="{ row }">
            <el-button type="danger" size="small" text @click="removeItem(row as SelectedItem)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 步骤3：提交 -->
      <div class="form-actions">
        <el-button type="primary" :loading="submitting" :disabled="!canSubmit" @click="handleSubmit">
          <el-icon v-if="!submitting"><Promotion /></el-icon>
          {{ submitting ? '提交中...' : `提交入库 (${selectedItems.length} 项)` }}
        </el-button>
        <el-button @click="clearAllSelections">
          <el-icon><RefreshRight /></el-icon>
          重置
        </el-button>
      </div>
    </div>

    <!-- 最近入库记录 -->
    <el-card shadow="hover" class="recent-records">
      <template #header>
        <div class="card-header">
          <el-icon><Clock /></el-icon>
          最近入库记录
        </div>
      </template>
      <el-table :data="recentRecords" stripe class="full-width">
        <el-table-column prop="inboundNo" label="入库单号" width="140" />
        <el-table-column prop="materialName" label="物料名称" />
        <el-table-column prop="materialCode" label="物料编号" width="120">
          <template #default="{ row }">{{ row.materialCode || '-' }}</template>
        </el-table-column>
        <el-table-column prop="quantity" label="数量" width="80" />
        <el-table-column prop="warehouse" label="仓库" width="100" />
        <el-table-column prop="location" label="货位" width="100" />
        <el-table-column prop="inboundTime" label="入库时间" width="160">
          <template #default="{ row }">{{ formatDate(row.inboundTime) }}</template>
        </el-table-column>
        <el-table-column prop="applicant" label="操作人" width="100" />
      </el-table>
      <el-empty v-if="recentRecords.length === 0" description="暂无入库记录" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, ArrowRight, Checked, Delete, Promotion, RefreshRight, Clock } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { getDirectMaterials, getSubItems } from '@/api/directMaterial.api'
import { getWarehouses, getLocations } from '@/api/inbound.api'
import { getInventoryList, addInventory } from '@/api/inventory.api'
import type { DirectMaterial, DirectMaterialSubItem, InventoryItem } from '@/types'

const authStore = useAuthStore()

// ==================== 搜索状态 ====================
const searchKeyword = ref('')
const searching = ref(false)
const searchResults = ref<DirectMaterial[]>([])
const hasSearched = ref(false)
const searchFailed = ref(false)

// ==================== 展开 & 子项 ====================
const expandedIds = ref<Set<number>>(new Set())
const subItemsMap = reactive<Record<number, DirectMaterialSubItem[]>>({})
const subLoading = reactive<Record<number, boolean>>({})

// ==================== 选择状态 ====================
// 每个子项的入库数量（选择数量=选中入库，清空=不入库）: key = `${parentId}-${subItemId}`
const inboundQtyMap = reactive<Record<string, number | undefined | ''>>({})

// 每项的仓库/货位选择（key = `${parentId}-${subItemId}`）
const itemWarehouse = reactive<Record<string, string>>({})
const itemLocation = reactive<Record<string, string>>({})
// 每项的货位选项缓存
const locationOptionsMap = reactive<Record<string, string[]>>({})

// 仓库选项
const warehouseOptions = ref<{ id: number; name: string }[]>([])

// 提交与最近记录
const submitting = ref(false)
const recentRecords = ref<InventoryItem[]>([])

// ==================== 计算属性 ====================
interface SelectedItem {
  parentId: number
  subItemId: number
  poNo: string
  sapDrawingNo: string
  materialName: string
  originalQty: number
  inboundQty: number
}

const selectedItems = computed<SelectedItem[]>(() => {
  const items: SelectedItem[] = []
  for (const [key, qty] of Object.entries(inboundQtyMap)) {
    if (qty == null || qty === '') continue
    const [parentIdStr, subItemIdStr] = key.split('-')
    const parentId = Number(parentIdStr)
    const subItemId = Number(subItemIdStr)
    const record = searchResults.value.find(r => r.id === parentId)
    const sub = (subItemsMap[parentId] || []).find(s => s.id === subItemId)
    if (!record || !sub) continue
    items.push({
      parentId,
      subItemId,
      poNo: record.poNo,
      sapDrawingNo: sub.sapDrawingNo,
      materialName: sub.purchaseDescription,
      originalQty: sub.quantity,
      inboundQty: Number(qty),
    })
  }
  return items
})

// 所有项均已选仓库+货位
const isAllLocationFilled = computed(() => {
  if (selectedItems.value.length === 0) return false
  return selectedItems.value.every(item => {
    const key = `${item.parentId}-${item.subItemId}`
    return itemWarehouse[key] && itemLocation[key]
  })
})

const canSubmit = computed(() => selectedItems.value.length > 0 && isAllLocationFilled.value)

// ==================== 搜索 ====================
async function handleSearch() {
  const kw = searchKeyword.value.trim()
  if (!kw) {
    ElMessage.warning('请输入PO号或关键词')
    return
  }
  searching.value = true
  hasSearched.value = true
  searchFailed.value = false
  try {
    const res = await getDirectMaterials({ keyword: kw })
    searchResults.value = res.data.list || []
  } catch {
    ElMessage.error('搜索失败，请重试')
    searchResults.value = []
    searchFailed.value = true
  } finally {
    searching.value = false
  }
}

function clearSearch() {
  searchResults.value = []
  hasSearched.value = false
  searchFailed.value = false
}

// ==================== 展开/折叠 ====================
async function toggleExpand(parentId: number) {
  if (expandedIds.value.has(parentId)) {
    expandedIds.value.delete(parentId)
  } else {
    expandedIds.value.add(parentId)
    if (!subItemsMap[parentId]) {
      await loadSubItems(parentId)
    }
  }
}

async function loadSubItems(parentId: number) {
  subLoading[parentId] = true
  try {
    const res = await getSubItems(parentId)
    subItemsMap[parentId] = res.data || []
  } catch {
    subItemsMap[parentId] = []
  } finally {
    subLoading[parentId] = false
  }
}

// ==================== 子项选择 ====================
// 生成入库数量下拉选项：1 ~ 原始数量
function qtyOptions(max: number): number[] {
  return Array.from({ length: Math.max(1, Math.floor(Number(max) || 1)) }, (_, i) => i + 1)
}

function removeItem(item: SelectedItem) {
  const key = `${item.parentId}-${item.subItemId}`
  delete inboundQtyMap[key]
  delete itemWarehouse[key]
  delete itemLocation[key]
  delete locationOptionsMap[key]
}

function clearAllSelections() {
  for (const key of Object.keys(inboundQtyMap)) delete inboundQtyMap[key]
  for (const key of Object.keys(itemWarehouse)) delete itemWarehouse[key]
  for (const key of Object.keys(itemLocation)) delete itemLocation[key]
  for (const key of Object.keys(locationOptionsMap)) delete locationOptionsMap[key]
}

// ==================== 仓库-货位联动 ====================
async function onWarehouseChange(key: string, warehouseName: string) {
  itemLocation[key] = ''
  if (!warehouseName) {
    locationOptionsMap[key] = []
    return
  }
  try {
    const res = await getLocations({ warehouseName })
    locationOptionsMap[key] = res.data.list.map(l => l.locationCode)
  } catch {
    locationOptionsMap[key] = []
  }
}

function getLocationOptions(key: string): string[] {
  return locationOptionsMap[key] || []
}

async function loadWarehouses() {
  try {
    const res = await getWarehouses()
    warehouseOptions.value = res.data.list
  } catch {
    warehouseOptions.value = []
  }
}

// ==================== 提交（直接写入库存台账，无审批） ====================
async function handleSubmit() {
  if (!canSubmit.value) {
    ElMessage.warning('请至少选择一项并为所有项选择仓库和货位')
    return
  }

  const user = authStore.user
  if (!user) {
    ElMessage.error('请先登录')
    return
  }

  submitting.value = true
  try {
    const inboundNos: string[] = []

    for (let idx = 0; idx < selectedItems.value.length; idx++) {
      const item = selectedItems.value[idx]
      const key = `${item.parentId}-${item.subItemId}`
      const parent = searchResults.value.find(r => r.id === item.parentId)
      if (!parent) {
        ElMessage.error(`第${idx + 1}项入库失败: 未找到对应PO记录`)
        return
      }

      // 单价 = 主记录金额 / 数量（保留2位小数，无法计算时为0）
      const unitPrice = parent.quantity > 0
        ? Math.round((parent.amount / parent.quantity) * 100) / 100
        : 0

      const res = await addInventory({
        materialName: item.materialName,
        materialCode: item.sapDrawingNo,
        projectCode: parent.projectCode || '',
        pbu: parent.pbu || '',
        exempt3C: parent.exempt3C || '',
        materialCategory: '',
        owner: parent.owner || parent.applicant || '',
        department: parent.department || '',
        poNumber: parent.poNo,
        supplierCode: parent.supplierCode || '',
        quantity: item.inboundQty,
        unit: '件',
        warehouse: itemWarehouse[key],
        location: itemLocation[key],
        unitPrice,
        applicant: user.name,
      })

      if (res.code !== 200) {
        ElMessage.error(`第${idx + 1}项入库失败: ${res.message}`)
        return
      }
      inboundNos.push(res.data.inboundNo)
    }

    ElMessage.success(`入库成功！共 ${inboundNos.length} 项已写入库存台账，入库单号：${inboundNos.join('、')}`)
    clearAllSelections()
    loadRecentRecords()
  } catch {
    ElMessage.error('提交失败，请重试')
  } finally {
    submitting.value = false
  }
}

// ==================== 最近入库记录 ====================
async function loadRecentRecords() {
  try {
    const res = await getInventoryList({})
    recentRecords.value = res.data.list.slice(-20).reverse()
  } catch {
    recentRecords.value = []
  }
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

onMounted(() => {
  loadWarehouses()
  loadRecentRecords()
})
</script>

<style scoped>
.full-width { width: 100%; }
.keeper-inbound { padding: 24px 0; }

.keeper-hint { margin-bottom: 20px; }

/* 搜索区 */
.search-section { margin-bottom: 20px; }
.search-bar { display: flex; gap: 12px; align-items: center; }
.po-search { width: 420px; }

/* 搜索结果 */
.results-section { margin-bottom: 20px; }
.results-header {
  font-size: 13px;
  color: var(--jc-text-light);
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--jc-border-line-light);
}

.empty-results { padding: 20px 0; }

/* 记录卡片 */
.record-card {
  border: 1px solid var(--jc-border-line-light);
  border-radius: var(--jc-radius-card);
  margin-bottom: 12px;
  overflow: hidden;
  transition: border-color 0.2s;
}
.record-card:hover { border-color: var(--jc-accent-teal); }

.record-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  cursor: pointer;
  background: var(--jc-bg-gray);
  transition: background 0.2s;
}
.record-header:hover { background: var(--jc-hover-bg, #f5f5f5); }

.record-main-info {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  font-size: 13px;
}

.po-tag {
  background: rgba(0, 128, 128, 0.1);
  color: var(--jc-accent-teal);
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
  font-family: monospace;
  font-size: 12px;
}

.record-field { color: var(--jc-text-light); }

.expand-icon {
  transition: transform 0.2s;
  color: var(--jc-text-light);
}
.expand-icon.is-expanded { transform: rotate(90deg); }

/* 子项区 */
.sub-items-section { padding: 12px 16px; border-top: 1px solid var(--jc-border-line-light); }
.sub-table { width: 100%; }
.qty-select { width: 130px; }

/* 已选汇总 */
.selection-summary {
  border: 1px solid var(--jc-border-line-light);
  border-radius: var(--jc-radius-card);
  padding: 20px;
  background: var(--jc-card-white);
  margin-top: 8px;
}

.summary-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--jc-border-line-light);
}

.summary-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--jc-text-dark);
  display: flex;
  align-items: center;
  gap: 6px;
}
.summary-title .el-icon { color: var(--jc-accent-teal); }

.items-table { width: 100%; margin-bottom: 16px; }
.qty-select-small { width: 90px; }

/* 提交按钮 */
.form-actions {
  display: flex;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--jc-border-line-light);
}

/* 最近入库记录 */
.recent-records { margin-top: 24px; }
.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--jc-text-dark);
}
</style>
