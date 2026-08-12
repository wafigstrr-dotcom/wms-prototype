<template>
  <div class="request-outbound">
    <!-- 区块一：直接物料检索 + 子项展开领用 -->
    <el-card shadow="never" class="search-card">
      <template #header>
        <div class="card-header">
          <span><el-icon><Search /></el-icon> 库存检索（仅显示有可用库存的直接物料主记录，展开查看子项明细）</span>
        </div>
      </template>
      <el-row :gutter="16" class="filter-row">
        <el-col :span="8">
          <el-input v-model="keyword" placeholder="模糊查询：PO号、物料名称、申请人、供应商..." clearable @keyup.enter="search" />
        </el-col>
        <el-col :span="4">
          <el-button type="primary" @click="search">
            <el-icon><Search /></el-icon> 查库存
          </el-button>
        </el-col>
      </el-row>

      <el-table
        :data="materialList"
        stripe
        border
        size="small"
        max-height="480"
        v-loading="loading"
        row-key="id"
        @expand-change="onExpandChange"
      >
        <el-table-column type="expand">
          <template #default="{ row: parentRow }">
            <div class="sub-item-panel">
              <div class="sub-toolbar">
                <span class="sub-title">子项明细（{{ (subCache[parentRow.id] || []).length }}）</span>
              </div>
              <el-table :data="subCache[parentRow.id] || []" v-loading="subLoading[parentRow.id]" size="small" border class="sub-table">
                <el-table-column type="index" label="序号" width="60" align="center" />
                <el-table-column prop="sapDrawingNo" label="SAP号/图号" min-width="140">
                  <template #default="{ row: sub }"><span class="code-text">{{ sub.sapDrawingNo || '-' }}</span></template>
                </el-table-column>
                <el-table-column prop="purchaseDescription" label="物料名称" min-width="200" show-overflow-tooltip />
                <el-table-column prop="quantity" label="数量" width="80" align="right" />
                <el-table-column label="可用库存" width="100" align="right">
                  <template #default="{ row: sub }">
                    <span :class="subAvailable(parentRow as DirectMaterial, sub as DirectMaterialSubItem) > 0 ? 'available-value' : 'zero-value'">{{ subAvailable(parentRow as DirectMaterial, sub as DirectMaterialSubItem) }}</span>
                  </template>
                </el-table-column>
                <el-table-column label="领用数量" width="140" align="center">
                  <template #default="{ row: sub }">
                    <el-input-number
                      v-model="subQtyInputs[`${parentRow.id}-${sub.id}`]"
                      :min="1"
                      :max="Math.max(1, subAvailable(parentRow as DirectMaterial, sub as DirectMaterialSubItem))"
                      :disabled="subAvailable(parentRow as DirectMaterial, sub as DirectMaterialSubItem) <= 0"
                      size="small"
                      class="qty-input"
                    />
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="80" align="center">
                  <template #default="{ row: sub }">
                    <el-button
                      type="primary"
                      size="small"
                      circle
                      :disabled="subAvailable(parentRow as DirectMaterial, sub as DirectMaterialSubItem) <= 0"
                      @click="addSubToCart(parentRow as DirectMaterial, sub as DirectMaterialSubItem)"
                    >
                      <el-icon><Plus /></el-icon>
                    </el-button>
                  </template>
                </el-table-column>
                <template #empty>
                  <el-empty description="该记录暂无子项明细" :image-size="60" />
                </template>
              </el-table>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="poNo" label="PO号" min-width="120">
          <template #default="{ row }"><span class="code-text">{{ row.poNo || '-' }}</span></template>
        </el-table-column>
        <el-table-column prop="orderDate" label="下单日期" min-width="100" />
        <el-table-column prop="purchaseDescription" label="物料名称" min-width="160" show-overflow-tooltip />
        <el-table-column prop="sapDrawingNo" label="SAP号/图号" min-width="120">
          <template #default="{ row }"><span class="code-text">{{ row.sapDrawingNo || '-' }}</span></template>
        </el-table-column>
        <el-table-column prop="quantity" label="数量" min-width="70" align="right" />
        <el-table-column prop="applicant" label="申请人" min-width="80" show-overflow-tooltip />
        <el-table-column prop="department" label="所属部门" min-width="90" show-overflow-tooltip />
        <el-table-column prop="projectCode" label="项目编号" min-width="100" show-overflow-tooltip />
        <el-table-column prop="pbu" label="PBU" min-width="70" align="center" />
        <el-table-column prop="supplierName" label="供应商名称" min-width="140" show-overflow-tooltip />
        <template #empty>
          <el-empty description="暂无有可用库存的直接物料记录" :image-size="60" />
        </template>
        <el-table-column label="子项" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.subItemCount ? 'primary' : 'info'" size="small" effect="plain">{{ row.subItemCount || 0 }} 项</el-tag>
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
      <el-empty v-else description="请从上方检索区展开主记录，按子项添加需要领用的物料" />

      <!-- 提交表单 -->
      <el-form :model="form" label-width="100px" class="submit-form" v-if="cart.length > 0">
        <el-row :gutter="20">
          <el-col :span="16">
            <el-form-item label="领料原因" required>
              <el-input v-model="form.reason" type="textarea" :rows="2" placeholder="请填写领用原因/用途，供审批参考" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="审批经理" required>
              <el-select 
                v-model="form.approver" 
                placeholder="请选择审批经理" 
                style="width: 100%" 
                filterable
                remote
                :remote-method="searchApprover"
                reserve-keyword
              >
                <el-option
                  v-for="user in approverOptions"
                  :key="user.gid"
                  :label="`${user.department} - ${user.name} (${user.role})`"
                  :value="user.name"
                />
              </el-select>
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
import { getDirectMaterials, getSubItems } from '@/api/directMaterial.api'
import { getUsers } from '@/api/users.api'  // ← 新增：使用用户管理 API
import { useAuthStore } from '@/stores/auth'
import type { InventoryItem, DirectMaterial, DirectMaterialSubItem } from '@/types'

const auth = useAuthStore()

const keyword = ref('')
const loading = ref(false)
const materialList = ref<DirectMaterial[]>([])

// 库存索引（用于子项可用库存计算与加购拆行）
const allInventory = ref<InventoryItem[]>([])
const lockedMap = ref<Record<string, number>>({})

// 子项懒加载缓存
const subCache = reactive<Record<number, DirectMaterialSubItem[]>>({})
const subLoading = reactive<Record<number, boolean>>({})
// 每个子项的领用数量输入: key = `${parentId}-${subId}`
const subQtyInputs = reactive<Record<string, number>>({})

interface CartItem extends InventoryItem { reqQty: number }
const cart = ref<CartItem[]>([])

const form = reactive({ reason: '', approver: '' })
const submitting = ref(false)

// V2.6: 审批经理选项（展示所有用户）
const approverOptions = ref<{ id: number; gid: string; name: string; role: string; department: string }[]>([])
const searchKeyword = ref('') // 搜索关键字

onMounted(() => {
  loadKeeperOptions()
})

// V2.6: 加载审批经理选项（支持分页 + 模糊搜索，不限制角色）
async function loadKeeperOptions(keyword?: string) {
  try {
    const usersRes = await getUsers(keyword, undefined)  // ← 不传 role 参数，获取所有用户
    const allUsers = usersRes.data.list || []
    // ✓ 不过滤角色，所有用户都可选
    approverOptions.value = allUsers
      .map((u: any) => ({ id: u.id, gid: u.gid, name: u.name, role: u.role, department: u.department }))
  } catch {
    ElMessage.error('加载审批经理列表失败')
  }
}

// V2.6: 远程搜索审批经理
function searchApprover(query: string) {
  if (query !== searchKeyword.value) {
    searchKeyword.value = query
    loadKeeperOptions(query)
  }
}

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

// ==================== 主记录检索 ====================
async function loadData() {
  loading.value = true
  try {
    const [dmRes, invRes, lockedRes] = await Promise.all([
      getDirectMaterials({ keyword: keyword.value.trim() || undefined }),
      request.get('/api/v1/inventory'),
      getLockedStock(),
    ])
    allInventory.value = invRes.data.list || []
    lockedMap.value = lockedRes.data || {}
    // 预拉全部主记录子项，仅保留至少一个子项有可用库存的主记录（领用出库只展示有货物料）
    const all = dmRes.data.list || []
    const withSubs = await Promise.all(
      all.map(async m => ({ m, subs: (await getSubItems(m.id)).data || [] }))
    )
    const filtered: DirectMaterial[] = []
    for (const { m, subs } of withSubs) {
      const stocked = subs.filter(s => baseAvailable(m, s) > 0)
      if (stocked.length > 0) {
        subCache[m.id] = stocked
        m.subItemCount = stocked.length
        filtered.push(m)
      }
    }
    materialList.value = filtered
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

function search() { loadData() }

// ==================== 子项展开（懒加载 + 缓存） ====================
async function onExpandChange(row: unknown, expanded: unknown) {
  const parent = row as DirectMaterial
  const isExpanded = Array.isArray(expanded)
    ? (expanded as DirectMaterial[]).some(r => r.id === parent.id)
    : !!expanded
  if (isExpanded && !subCache[parent.id]) await loadSubItems(parent.id)
}

async function loadSubItems(parentId: number) {
  subLoading[parentId] = true
  try {
    const res = await getSubItems(parentId)
    subCache[parentId] = res.data || []
    syncCount(parentId)
  } finally {
    subLoading[parentId] = false
  }
}

// 同步父行的子项计数（避免整表重载）
function syncCount(parentId: number) {
  const target = materialList.value.find(m => m.id === parentId)
  if (target) target.subItemCount = (subCache[parentId] || []).length
}

// ==================== 子项 -> 库存匹配 ====================
function matchInventory(parent: DirectMaterial, sub: DirectMaterialSubItem): InventoryItem[] {
  if (!sub.sapDrawingNo) return []
  return allInventory.value
    .filter(i => i.materialCode === sub.sapDrawingNo && (!parent.poNo || !i.poNumber || i.poNumber === parent.poNo))
    .sort((a, b) => (a.inboundTime || '').localeCompare(b.inboundTime || ''))
}

// 子项基础可用库存（不含购物车占用，用于主记录过滤，避免加购后行消失）
function baseAvailable(parent: DirectMaterial, sub: DirectMaterialSubItem): number {
  return matchInventory(parent, sub).reduce((s, inv) => s + getAvailable(inv), 0)
}

// 子项可用库存（含购物车中已占用量的预扣）
function subAvailable(parent: DirectMaterial, sub: DirectMaterialSubItem): number {
  let total = 0
  for (const inv of matchInventory(parent, sub)) {
    const inCart = cart.value.filter(c => c.inboundNo === inv.inboundNo).reduce((s, c) => s + c.reqQty, 0)
    total += Math.max(0, getAvailable(inv) - inCart)
  }
  return total
}

// ==================== 加购（按子项，FIFO 拆行） ====================
function addSubToCart(parent: DirectMaterial, sub: DirectMaterialSubItem) {
  const key = `${parent.id}-${sub.id}`
  const qty = subQtyInputs[key] || 1
  const available = subAvailable(parent, sub)
  if (qty <= 0 || qty > available) {
    ElMessage.error('可用库存不足或输入数量无效')
    return
  }

  const rows = matchInventory(parent, sub)
  let remaining = qty
  for (const inv of rows) {
    if (remaining <= 0) break
    const inCart = cart.value.filter(c => c.inboundNo === inv.inboundNo).reduce((s, c) => s + c.reqQty, 0)
    const room = getAvailable(inv) - inCart
    if (room <= 0) continue
    const take = Math.min(remaining, room)
    const existing = cart.value.find(c => c.inboundNo === inv.inboundNo)
    if (existing) {
      existing.reqQty += take
    } else {
      cart.value.push({ ...inv, reqQty: take })
    }
    remaining -= take
  }

  if (remaining > 0) {
    ElMessage.error('可用库存不足，已按最大可用量加入')
    return
  }
  ElMessage.success(`已添加 ${qty} 件 [${sub.purchaseDescription || sub.sapDrawingNo || '未知物料'}] 到领用购物车`)
  delete subQtyInputs[key]
}

// ==================== 提交 ====================
async function submit() {
  if (!form.reason.trim()) {
    ElMessage.error('请务必填写领料原因/用途')
    return
  }
  if (cart.value.length === 0) {
    ElMessage.error('请至少添加一项物料到待领用清单')
    return
  }

  // V2.6：不再自动匹配，直接使用用户选择的 approver

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

// V2.6: autoApprover 已废弃，不再使用（改为人工选择审批经理）

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
.zero-value {
  color: var(--el-color-danger);
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
/* 子项展开区（与直接物料维护页一致） */
.sub-item-panel { padding: 12px 16px 16px 48px; background: var(--el-fill-color-light); }
.sub-toolbar { display: flex; align-items: center; margin-bottom: 10px; }
.sub-title { font-size: 13px; font-weight: 600; color: var(--el-text-color-primary); }
.sub-table { width: 100%; }
.code-text { font-family: monospace; letter-spacing: 0.5px; }
</style>
