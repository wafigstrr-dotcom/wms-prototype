<template>
  <div class="request-outbound">
    <!-- 区块一：库存检索 + 结果表格 -->
    <el-card shadow="never" class="search-card">
      <template #header>
        <div class="card-header">
          <span><el-icon><Search /></el-icon> 库存检索</span>
        </div>
      </template>
      <el-row :gutter="16" class="filter-row">
        <el-col :span="8">
          <el-input v-model="keyword" placeholder="模糊查询：物料名称或编号" clearable @keyup.enter="search" />
        </el-col>
        <el-col :span="4">
          <el-button type="primary" @click="search">
            <el-icon><Search /></el-icon> 查库存
          </el-button>
        </el-col>
      </el-row>

      <el-table :data="inventoryList" stripe border size="small" max-height="400" v-loading="loading">
        <el-table-column prop="materialName" label="物料名称" min-width="120" show-overflow-tooltip />
        <el-table-column prop="materialCode" label="物料编号" min-width="100" show-overflow-tooltip />
        <el-table-column prop="applicant" label="申请人" min-width="80" show-overflow-tooltip />
        <el-table-column prop="projectCode" label="项目编号" min-width="90" show-overflow-tooltip />
        <el-table-column prop="pbu" label="PBU" min-width="70" show-overflow-tooltip />
        <el-table-column prop="exempt3C" label="免3C" min-width="70" align="center" />
        <el-table-column prop="materialCategory" label="物料类别" min-width="80" show-overflow-tooltip />
        <el-table-column prop="owner" label="所属人" min-width="70" show-overflow-tooltip />
        <el-table-column prop="department" label="所属部门" min-width="80" show-overflow-tooltip />
        <el-table-column prop="poNumber" label="PO号" min-width="100" show-overflow-tooltip />
        <el-table-column prop="supplierCode" label="供应商编号" min-width="100" show-overflow-tooltip />
        <el-table-column prop="quantity" label="领前库存数量" min-width="100" align="right" />
        <el-table-column prop="unit" label="单位" min-width="50" align="center" />
        <el-table-column prop="inboundTime" label="入库时间" min-width="130" show-overflow-tooltip>
          <template #default="{ row }">{{ formatTime(row.inboundTime) }}</template>
        </el-table-column>
        <el-table-column prop="inboundNo" label="入库单号" min-width="120" show-overflow-tooltip />
        <el-table-column prop="remainingStock" label="剩余库存" min-width="70" align="right" />
        <el-table-column prop="agingDays" label="账龄周期" min-width="80" align="right">
          <template #default="{ row }">{{ row.agingDays || 0 }}天</template>
        </el-table-column>
        <el-table-column prop="dormantDays" label="呆滞周期" min-width="80" align="right">
          <template #default="{ row }">{{ row.dormantDays || 0 }}天</template>
        </el-table-column>
        <el-table-column label="可用库存" min-width="70" align="right">
          <template #default="{ row }">
            <span class="available-value">{{ getAvailable(row) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="warehouse" label="仓库" min-width="70" show-overflow-tooltip />
        <el-table-column prop="location" label="货位" min-width="70" show-overflow-tooltip />
        <el-table-column label="领用数量" min-width="110" align="center" fixed="right">
          <template #default="{ row, $index }">
            <el-input-number
              v-model="qtyInputs[$index]"
              :min="1"
              :max="getAvailable(row)"
              size="small"
              class="qty-input"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" min-width="60" align="center" fixed="right">
          <template #default="{ row, $index }">
            <el-button type="primary" size="small" circle @click="addToCart(row, $index)">
              <el-icon><Plus /></el-icon>
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 区块二：购物车 -->
    <el-card shadow="never" class="cart-card">
      <template #header>
        <div class="card-header">
          <span>
            <el-icon><ShoppingCart /></el-icon> 待领用清单
            <el-badge :value="cart.length" type="primary" class="badge-gap" />
          </span>
          <span class="count-text">
            共 {{ cart.reduce((s, c) => s + c.reqQty, 0) }} 件
          </span>
        </div>
      </template>

      <el-table :data="cart" stripe border size="small" v-if="cart.length > 0">
        <el-table-column prop="materialName" label="物料名称" min-width="120" show-overflow-tooltip />
        <el-table-column prop="materialCode" label="物料编号" min-width="100" show-overflow-tooltip />
        <el-table-column prop="applicant" label="申请人" min-width="80" show-overflow-tooltip />
        <el-table-column prop="projectCode" label="项目编号" min-width="90" show-overflow-tooltip />
        <el-table-column prop="pbu" label="PBU" min-width="70" show-overflow-tooltip />
        <el-table-column prop="exempt3C" label="免3C" min-width="70" align="center" />
        <el-table-column prop="materialCategory" label="物料类别" min-width="80" show-overflow-tooltip />
        <el-table-column prop="owner" label="所属人" min-width="70" show-overflow-tooltip />
        <el-table-column prop="department" label="所属部门" min-width="80" show-overflow-tooltip />
        <el-table-column prop="poNumber" label="PO号" min-width="100" show-overflow-tooltip />
        <el-table-column prop="supplierCode" label="供应商编号" min-width="100" show-overflow-tooltip />
        <el-table-column label="领出数量" min-width="110" align="center" class-name="highlight-qty">
          <template #default="{ row }">
            <el-input-number v-model="row.reqQty" :min="1" :max="getAvailable(row)" size="small" class="qty-input" />
          </template>
        </el-table-column>
        <el-table-column prop="unit" label="单位" min-width="50" align="center" />
        <el-table-column prop="inboundTime" label="入库时间" min-width="130" show-overflow-tooltip>
          <template #default="{ row }">{{ formatTime(row.inboundTime) }}</template>
        </el-table-column>
        <el-table-column prop="inboundNo" label="入库单号" min-width="120" show-overflow-tooltip />
        <el-table-column prop="remainingStock" label="领前余库" min-width="70" align="right" />
        <el-table-column prop="agingDays" label="账龄周期" min-width="80" align="right">
          <template #default="{ row }">{{ row.agingDays || 0 }}天</template>
        </el-table-column>
        <el-table-column prop="dormantDays" label="呆滞周期" min-width="80" align="right">
          <template #default="{ row }">{{ row.dormantDays || 0 }}天</template>
        </el-table-column>
        <el-table-column prop="warehouse" label="仓库" min-width="70" show-overflow-tooltip />
        <el-table-column prop="location" label="货位" min-width="70" show-overflow-tooltip />
        <el-table-column label="操作" min-width="60" align="center">
          <template #default="{ $index }">
            <el-button type="danger" size="small" circle @click="cart.splice($index, 1)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-else description="请从上方检索区添加需要领用的物料" />

      <!-- 提交表单 -->
      <el-form :model="form" label-width="100px" class="submit-form" v-if="cart.length > 0">
        <el-row :gutter="20">
          <el-col :span="16">
            <el-form-item label="领料原因" required>
              <el-input v-model="form.reason" type="textarea" :rows="2" placeholder="请填写领用原因/用途，供审批参考" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="审批经理">
              <el-input v-model="form.approver" disabled placeholder="待分配" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="24" class="text-right">
            <el-button type="primary" size="large" @click="submit" :loading="submitting">
              <el-icon><Promotion /></el-icon> 提交领用并流转审批
            </el-button>
          </el-col>
        </el-row>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Plus, ShoppingCart, Delete, Promotion } from '@element-plus/icons-vue'
import request from '@/utils/request'
import { getLockedStock, submitOutboundFlow } from '@/api/outbound.api'
import { useAuthStore } from '@/stores/auth'
import type { InventoryItem } from '@/types'

const auth = useAuthStore()

const keyword = ref('')
const loading = ref(false)
const inventoryList = ref<InventoryItem[]>([])
const lockedMap = ref<Record<string, number>>({})
const qtyInputs = ref<Record<number, number>>({})

interface CartItem extends InventoryItem { reqQty: number }
const cart = ref<CartItem[]>([])

const form = reactive({ reason: '', approver: '待分配' })
const submitting = ref(false)

function formatTime(iso: string): string {
  if (!iso) return '-'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function getAvailable(item: unknown): number {
  const inv = item as InventoryItem
  return Math.max(0, inv.remainingStock - (lockedMap.value[inv.inboundNo] || 0))
}

async function loadData() {
  loading.value = true
  try {
    const [invRes, lockedRes] = await Promise.all([
      request.get('/api/v1/inventory'),
      getLockedStock(),
    ])
    const allItems: InventoryItem[] = invRes.data.list || []
    // 只显示有可用库存的物料
    lockedMap.value = lockedRes.data || {}
    inventoryList.value = allItems.filter(i => getAvailable(i) > 0)
    qtyInputs.value = {}
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

function search() {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) { loadData(); return }
  loadData().then(() => {
    inventoryList.value = inventoryList.value.filter(i =>
      i.materialName.toLowerCase().includes(kw) ||
      (i.materialCode || '').toLowerCase().includes(kw)
    )
  })
}

function addToCart(row: unknown, index: number) {
  const item = row as InventoryItem
  const qty = qtyInputs.value[index] || 1
  const available = getAvailable(item)
  if (qty <= 0 || qty > available) {
    ElMessage.error('可用库存不足或输入数量无效')
    return
  }
  const existing = cart.value.find(c => c.inboundNo === item.inboundNo)
  if (existing) {
    if (existing.reqQty + qty > available) {
      ElMessage.error(`合并失败：超出可用库存上限 (${available})`)
      return
    }
    existing.reqQty += qty
  } else {
    cart.value.push({ ...item, reqQty: qty })
  }
  ElMessage.success(`已添加 ${qty} ${item.unit || ''} [${item.materialName || item.materialCode || '未知物料'}] 到领用购物车`)
}

async function submit() {
  if (!form.reason.trim()) {
    ElMessage.error('请务必填写领料原因/用途')
    return
  }
  submitting.value = true
  try {
    const res = await submitOutboundFlow('outbound_request', {
      items: cart.value.map(c => ({
        inboundNo: c.inboundNo, materialName: c.materialName, materialCode: c.materialCode,
        reqQty: c.reqQty, unit: c.unit, warehouse: c.warehouse, location: c.location,
      })),
      reason: form.reason,
      applicant: auth.userName,
      department: auth.user?.department || '',
      approver: form.approver,
    })
    if (res.code === 200) {
      ElMessage.success(`领用出库申请 ${res.data.flowNo} 已成功提交审批`)
      cart.value = []
      form.reason = ''
      await loadData()
    }
  } catch (e) {
    ElMessage.error('提交失败')
  } finally {
    submitting.value = false
  }
}

onMounted(() => { loadData() })
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
:deep(.highlight-qty .cell) {
  font-weight: bold;
  color: var(--el-color-primary);
}
.filter-row {
  margin-bottom: 16px;
}
.available-value {
  color: var(--el-color-success);
  font-weight: 600;
}
.qty-input {
  width: 90px;
}
.cart-card {
  margin-top: 16px;
}
.badge-gap {
  margin-left: 8px;
}
.count-text {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
.submit-form {
  margin-top: 20px;
}
.text-right {
  text-align: right;
}
</style>
