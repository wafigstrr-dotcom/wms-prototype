<template>
  <div class="transfer-page">
    <!-- 工具栏 -->
    <el-card shadow="never" class="toolbar-card">
      <div class="toolbar">
        <span class="toolbar-title">
          <el-icon><Sort /></el-icon>
          物料移库单 <span class="toolbar-subtitle">(检索清单流转模式)</span>
        </span>
        <div class="toolbar-actions">
          <el-button @click="exportTemplate">
            <el-icon><Download /></el-icon> 导出移库模板
          </el-button>
          <el-tooltip content="规划中" placement="top">
            <el-button type="warning" disabled>
              <el-icon><Upload /></el-icon> 多条移库 (导入)
            </el-button>
          </el-tooltip>
        </div>
      </div>
    </el-card>

    <!-- 区块一：库存检索 -->
    <el-card shadow="never" class="section-card">
      <template #header>
        <div class="card-header">
          <span><el-icon><Search /></el-icon> 库存检索</span>
        </div>
      </template>
      <el-row :gutter="16" class="filter-row">
        <el-col :span="8">
          <el-input
            v-model="keyword"
            placeholder="模糊查询：物料名称或编号"
            clearable
            @keyup.enter="search"
          />
        </el-col>
        <el-col :span="4">
          <el-button type="primary" @click="search">
            <el-icon><Search /></el-icon> 查库存
          </el-button>
        </el-col>
      </el-row>

      <el-table
        :data="inventoryList"
        stripe border size="small"
        max-height="380"
        v-loading="loading"
        class="full-table"
      >
        <el-table-column prop="materialName"      label="物料名称"   min-width="110" show-overflow-tooltip />
        <el-table-column prop="materialCode"      label="物料编号"   min-width="90"  show-overflow-tooltip />
        <el-table-column prop="applicant"         label="申请人"     min-width="70"  show-overflow-tooltip />
        <el-table-column prop="projectCode"       label="项目编号"   min-width="80"  show-overflow-tooltip />
        <el-table-column prop="pbu"               label="PBU"        min-width="60"  show-overflow-tooltip />
        <el-table-column prop="exempt3C"          label="免3C"       min-width="50"  show-overflow-tooltip />
        <el-table-column prop="materialCategory"  label="物料类别"   min-width="70"  show-overflow-tooltip />
        <el-table-column prop="owner"             label="所属人"     min-width="60"  show-overflow-tooltip />
        <el-table-column prop="department"        label="所属部门"   min-width="70"  show-overflow-tooltip />
        <el-table-column prop="poNumber"          label="PO号"       min-width="80"  show-overflow-tooltip />
        <el-table-column prop="supplierCode"      label="供应商编号" min-width="80"  show-overflow-tooltip />
        <el-table-column prop="quantity"          label="原数量"     min-width="60"  align="right" />
        <el-table-column prop="unit"              label="单位"       min-width="50"  align="center" />
        <el-table-column prop="inboundTime"       label="入库时间"   min-width="130" show-overflow-tooltip>
          <template #default="{ row }">{{ formatTime(row.inboundTime) }}</template>
        </el-table-column>
        <el-table-column prop="inboundNo"         label="入库单号"   min-width="110" show-overflow-tooltip />
        <el-table-column prop="remainingStock"    label="剩余库存"   min-width="60"  align="right" />
        <el-table-column label="账龄周期" min-width="70" align="right">
          <template #default="{ row }">{{ row.agingDays }}天</template>
        </el-table-column>
        <el-table-column label="呆滞周期" min-width="70" align="right">
          <template #default="{ row }">{{ row.dormantDays }}天</template>
        </el-table-column>
        <el-table-column prop="warehouse" label="当前仓库" min-width="80" show-overflow-tooltip />
        <el-table-column prop="location"  label="当前货位" min-width="80" show-overflow-tooltip />
        <el-table-column label="操作" min-width="80" align="center" fixed="right">
          <template #default="{ row }">
            <el-button
              type="warning"
              size="small"
              :disabled="isInCart(row.inboundNo)"
              @click="addToCart(row)"
            >
              {{ isInCart(row.inboundNo) ? '已在清单' : '加入清单' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 区块二：待移库清单 -->
    <el-card shadow="never" class="cart-card">
      <template #header>
        <div class="cart-header">
          <span>
            <el-icon color="#E65100"><Sort /></el-icon>
            <span class="cart-title">待移库清单</span>
            <el-badge :value="cart.length" type="warning" class="badge-gap" />
          </span>
          <span class="cart-count">
            共 {{ cart.reduce((s, c) => s + c.trfQty, 0) }} 件
          </span>
        </div>
      </template>

      <el-table
        v-if="cart.length > 0"
        :data="cart"
        stripe border size="small"
        max-height="350"
        class="full-table"
      >
        <el-table-column prop="materialName"      label="物料名称"   min-width="110" show-overflow-tooltip />
        <el-table-column prop="materialCode"      label="物料编号"   min-width="90"  show-overflow-tooltip />
        <el-table-column prop="applicant"         label="申请人"     min-width="70"  show-overflow-tooltip />
        <el-table-column prop="projectCode"       label="项目编号"   min-width="80"  show-overflow-tooltip />
        <el-table-column prop="pbu"               label="PBU"        min-width="60"  show-overflow-tooltip />
        <el-table-column prop="exempt3C"          label="免3C"       min-width="50"  show-overflow-tooltip />
        <el-table-column prop="materialCategory"  label="物料类别"   min-width="70"  show-overflow-tooltip />
        <el-table-column prop="owner"             label="所属人"     min-width="60"  show-overflow-tooltip />
        <el-table-column prop="department"        label="所属部门"   min-width="70"  show-overflow-tooltip />
        <el-table-column prop="poNumber"          label="PO号"       min-width="80"  show-overflow-tooltip />
        <el-table-column prop="supplierCode"      label="供应商编号" min-width="80"  show-overflow-tooltip />
        <el-table-column label="原数量" min-width="60" align="right">
          <template #default="{ row }">
            <span class="qty-value">{{ row.quantity }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="unit"           label="单位"     min-width="50"  align="center" />
        <el-table-column prop="inboundTime"    label="入库时间" min-width="130" show-overflow-tooltip>
          <template #default="{ row }">{{ formatTime(row.inboundTime) }}</template>
        </el-table-column>
        <el-table-column prop="inboundNo"      label="入库单号" min-width="110" show-overflow-tooltip />
        <el-table-column prop="remainingStock" label="剩余库存" min-width="60"  align="right" />
        <el-table-column label="账龄周期" min-width="70" align="right">
          <template #default="{ row }">{{ row.agingDays }}天</template>
        </el-table-column>
        <el-table-column label="呆滞周期" min-width="70" align="right">
          <template #default="{ row }">{{ row.dormantDays }}天</template>
        </el-table-column>
        <el-table-column prop="warehouse" label="原仓库" min-width="80" show-overflow-tooltip />
        <el-table-column prop="location"  label="原货位" min-width="80" show-overflow-tooltip />
        <!-- 移库数量 -->
        <el-table-column label="移库数量*" min-width="110" align="center" fixed="right">
          <template #default="{ row }">
            <el-input-number
              v-model="row.trfQty"
              :min="1"
              :max="row.remainingStock"
              size="small"
              class="trf-qty-input"
            />
          </template>
        </el-table-column>
        <!-- 新仓库 -->
        <el-table-column label="新仓库*" min-width="130" fixed="right">
          <template #default="{ row }">
            <el-select
              v-model="row.newWarehouse"
              placeholder="选择仓库"
              size="small"
              class="wh-select"
              @change="(val: string) => onWarehouseChange(row, val)"
            >
              <el-option
                v-for="wh in warehouseOptions"
                :key="wh.name"
                :label="wh.name"
                :value="wh.name"
              />
            </el-select>
          </template>
        </el-table-column>
        <!-- 新货位 -->
        <el-table-column label="新货位*" min-width="120" fixed="right">
          <template #default="{ row }">
            <el-select
              v-model="row.newLocation"
              placeholder="选择货位"
              size="small"
              class="loc-select"
              :disabled="!row.newWarehouse"
            >
              <el-option
                v-for="loc in getLocationOptions(row.newWarehouse)"
                :key="loc.locationCode"
                :label="loc.locationCode"
                :value="loc.locationCode"
              />
            </el-select>
          </template>
        </el-table-column>
        <!-- 移除 -->
        <el-table-column label="移除" min-width="60" align="center" fixed="right">
          <template #default="{ $index }">
            <el-button type="danger" size="small" circle @click="removeFromCart($index)">
              <el-icon><Close /></el-icon>
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-else description="请从上方库存检索区选择需要移库的物料，点击【加入清单】" />

      <!-- 提交按钮 -->
      <div v-if="cart.length > 0" class="submit-bar">
        <el-button type="primary" size="large" :loading="submitting" @click="submitTransfer">
          <el-icon><Promotion /></el-icon>
          提交移库（{{ cart.length }} 条）
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Sort, Search, Download, Upload, Close, Promotion } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import type { InventoryItem, Warehouse, Location } from '@/types'
import {
  getInventoryList,
  updateInventoryLocation,
  createTransferFlow,
  getWarehouses,
  getLocationsByWarehouse,
  type TransferFlowData,
} from '@/api/transfer.api'
import { exportToExcel } from '@/utils/export'

const auth = useAuthStore()

// ==================== 状态 ====================
const keyword = ref('')
const loading = ref(false)
const submitting = ref(false)
const inventoryList = ref<InventoryItem[]>([])

interface CartItem extends InventoryItem {
  trfQty: number
  newWarehouse: string
  newLocation: string
}
const cart = ref<CartItem[]>([])

const warehouseOptions = ref<Warehouse[]>([])
const locationCache = ref<Record<string, Location[]>>({})

// ==================== 辅助函数 ====================
function formatTime(iso: string): string {
  if (!iso) return '-'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// ==================== 数据加载 ====================
async function loadData(kw?: string) {
  loading.value = true
  try {
    const res = await getInventoryList(kw)
    const all: InventoryItem[] = res.data.list || []
    inventoryList.value = all.filter(i => i.remainingStock > 0)
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

function search() {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) { loadData(); return }
  loadData(kw)
}

// ==================== 购物车操作 ====================
function isInCart(inboundNo: string): boolean {
  return cart.value.some(c => c.inboundNo === inboundNo)
}

function addToCart(row: any) {
  if (isInCart(row.inboundNo)) {
    ElMessage.warning('该入库单号已在移库清单中，不可重复添加')
    return
  }
  cart.value.push({ ...row, trfQty: 1, newWarehouse: '', newLocation: '' })
}

function removeFromCart(index: number) {
  cart.value.splice(index, 1)
}

// ==================== 仓库/货位联动 ====================
async function loadWarehouses() {
  try {
    const res = await getWarehouses()
    warehouseOptions.value = res.data.list || []
  } catch (e) {
    console.error('加载仓库列表失败', e)
  }
}

async function onWarehouseChange(row: any, warehouse: string) {
  row.newLocation = ''
  if (!warehouse) return
  if (!locationCache.value[warehouse]) {
    try {
      const res = await getLocationsByWarehouse(warehouse)
      locationCache.value[warehouse] = res.data.list || []
    } catch (e) {
      console.error('加载库位失败', e)
      locationCache.value[warehouse] = []
    }
  }
}

function getLocationOptions(warehouse: string): Location[] {
  return locationCache.value[warehouse] || []
}

// ==================== 提交 ====================
async function submitTransfer() {
  if (cart.value.length === 0) {
    ElMessage.warning('移库清单为空，请先添加物料')
    return
  }
  // 逐行校验
  for (const item of cart.value) {
    if (!item.trfQty || item.trfQty <= 0 || item.trfQty > item.remainingStock) {
      ElMessage.error(`[${item.materialName || item.materialCode}] 移库数量无效（需 > 0 且不超剩余库存 ${item.remainingStock}）`)
      return
    }
    if (!item.newWarehouse) {
      ElMessage.error(`[${item.materialName || item.materialCode}] 请选择目标仓库`)
      return
    }
    if (!item.newLocation) {
      ElMessage.error(`[${item.materialName || item.materialCode}] 请选择目标货位`)
      return
    }
  }

  submitting.value = true
  try {
    const results: string[] = []
    for (const item of cart.value) {
      // 更新库存位置
      await updateInventoryLocation(item.id, {
        warehouse: item.newWarehouse,
        location: item.newLocation,
      })
      // 写入转移流水
      const flowData: TransferFlowData = {
        materialName: item.materialName,
        materialCode: item.materialCode,
        inboundNo: item.inboundNo,
        trfQty: item.trfQty,
        unit: item.unit,
        fromWarehouse: item.warehouse,
        fromLocation: item.location,
        toWarehouse: item.newWarehouse,
        toLocation: item.newLocation,
        operator: auth.userName,
      }
      await createTransferFlow(flowData, auth.user?.id || 0)
      results.push(item.materialName || item.materialCode)
    }
    ElMessage.success(`移库成功，共 ${results.length} 条记录已更新`)
    cart.value = []
    await loadData()
  } catch (e) {
    ElMessage.error('移库提交失败，请重试')
    console.error(e)
  } finally {
    submitting.value = false
  }
}

// ==================== Excel 模板导出 ====================
function exportTemplate() {
  const headers = ['物料名称', '物料编号', '原仓库', '目标仓库', '目标货位']
  const rows = cart.value.length > 0
    ? cart.value.map(c => [c.materialName, c.materialCode, c.warehouse, c.newWarehouse || '', c.newLocation || ''] as (string | number)[])
    : [['（示例）测试物料A', 'MAT-001', '主仓库', '备件仓', 'B-01-01'] as (string | number)[]]
  exportToExcel('移库模板', headers, rows, '移库模板')
  ElMessage.success('移库模板已下载')
}

onMounted(() => {
  loadData()
  loadWarehouses()
})
</script>

<style scoped>
.toolbar-card {
  background: #f8f9fa;
}
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.toolbar-title {
  font-size: 16px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
}
.toolbar-subtitle {
  font-size: 13px;
  font-weight: 400;
  color: var(--el-text-color-secondary);
}
.toolbar-actions {
  display: flex;
  gap: 12px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.cart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #FFF8E1;
  padding: 4px 8px;
  border-radius: 4px;
}
.cart-card :deep(.el-card__header) {
  padding: 0;
}
.cart-card {
  margin-top: 12px;
}
.section-card {
  margin-top: 12px;
}
.filter-row {
  margin-bottom: 16px;
}
.full-table {
  width: 100%;
}
.cart-title {
  color: #E65100;
  font-weight: 700;
}
.badge-gap {
  margin-left: 8px;
}
.cart-count {
  color: #E65100;
  font-size: 13px;
}
.qty-value {
  color: #E65100;
  font-weight: 600;
}
.wh-select {
  width: 115px;
}
.loc-select {
  width: 105px;
}
.submit-bar {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
  border-top: 1px solid var(--el-border-color-lighter);
  margin-top: 16px;
}
/* 移库数量输入框橙色边框 */
.trf-qty-input {
  width: 95px;
}
.trf-qty-input :deep(.el-input__wrapper) {
  border: 1px solid #FF9800 !important;
  box-shadow: none !important;
}
</style>
