<template>
  <div class="scrap-outbound">
    <!-- 区块一：直接物料检索 + 子项展开 + 批次选择 -->
    <el-card shadow="never" class="search-card">
      <template #header>
        <div class="card-header">
          <span><el-icon><Search /></el-icon> 报废库存检索（仅显示有可用库存的直接物料主记录，逐级展开选择报废批次）</span>
        </div>
      </template>
      <el-row :gutter="16" class="filter-row">
        <el-col :span="8">
          <el-input v-model="keyword" placeholder="模糊查询：PO号、物料名称、申请人、供应商..." clearable @keyup.enter="search" />
        </el-col>
        <el-col :span="4">
          <el-button type="primary" @click="search"><el-icon><Search /></el-icon> 查库存</el-button>
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
                <span class="sub-title">子项明细（{{ (subCache[parentRow.id] || []).length }}），再次展开子项行查看入库批次</span>
              </div>
              <el-table :data="subCache[parentRow.id] || []" v-loading="subLoading[parentRow.id]" size="small" border class="sub-table" row-key="id">
                <el-table-column type="expand">
                  <template #default="{ row: subRow }">
                    <div class="batch-panel">
                      <div class="sub-toolbar">
                        <span class="sub-title">入库批次（{{ matchInventory(parentRow as DirectMaterial, subRow as DirectMaterialSubItem).length }}），请选择需报废的具体批次</span>
                      </div>
                      <el-table :data="matchInventory(parentRow as DirectMaterial, subRow as DirectMaterialSubItem)" size="small" border class="sub-table">
                        <el-table-column prop="inboundNo" label="入库单号" min-width="130">
                          <template #default="{ row: inv }"><span class="code-text">{{ inv.inboundNo }}</span></template>
                        </el-table-column>
                        <el-table-column label="入库时间" min-width="120">
                          <template #default="{ row: inv }">{{ formatTime(inv.inboundTime) }}</template>
                        </el-table-column>
                        <el-table-column label="账龄周期" min-width="80" align="right">
                          <template #default="{ row: inv }">
                            <span :class="{ 'aging-warn': (inv.agingDays || 0) >= 90 }">{{ inv.agingDays || 0 }}天</span>
                          </template>
                        </el-table-column>
                        <el-table-column label="呆滞周期" min-width="80" align="right">
                          <template #default="{ row: inv }">
                            <span :class="{ 'dormant-warn': (inv.dormantDays || 0) >= 90 }">{{ inv.dormantDays || 0 }}天</span>
                          </template>
                        </el-table-column>
                        <el-table-column prop="warehouse" label="仓库" min-width="70" show-overflow-tooltip />
                        <el-table-column prop="location" label="货位" min-width="70" show-overflow-tooltip />
                        <el-table-column label="可用库存" min-width="80" align="right">
                          <template #default="{ row: inv }">
                            <span :class="batchAvailable(inv as InventoryItem) > 0 ? 'available-value' : 'zero-value'">{{ batchAvailable(inv as InventoryItem) }}</span>
                          </template>
                        </el-table-column>
                        <el-table-column label="报废数量" width="140" align="center">
                          <template #default="{ row: inv }">
                            <el-input-number
                              v-model="batchQtyInputs[`${parentRow.id}-${subRow.id}-${(inv as InventoryItem).inboundNo}`]"
                              :min="1"
                              :max="Math.max(1, availableExcluding(inv as InventoryItem, inv as InventoryItem))"
                              :disabled="batchAvailable(inv as InventoryItem) <= 0"
                              size="small"
                              class="qty-input"
                            />
                          </template>
                        </el-table-column>
                        <el-table-column label="操作" width="80" align="center">
                          <template #default="{ row: inv }">
                            <el-button
                              type="danger"
                              size="small"
                              circle
                              :disabled="batchAvailable(inv as InventoryItem) <= 0"
                              @click="addBatchToCart(parentRow as DirectMaterial, subRow as DirectMaterialSubItem, inv as InventoryItem)"
                            >
                              <el-icon><Delete /></el-icon>
                            </el-button>
                          </template>
                        </el-table-column>
                      </el-table>
                    </div>
                  </template>
                </el-table-column>
                <el-table-column type="index" label="序号" width="60" align="center" />
                <el-table-column prop="sapDrawingNo" label="SAP号/图号" min-width="140">
                  <template #default="{ row: sub }"><span class="code-text">{{ sub.sapDrawingNo || '-' }}</span></template>
                </el-table-column>
                <el-table-column prop="purchaseDescription" label="物料名称" min-width="200" show-overflow-tooltip />
                <el-table-column prop="quantity" label="数量" width="80" align="right" />
                <el-table-column label="可用库存" width="100" align="right">
                  <template #default="{ row: sub }">
                    <span class="available-value">{{ subAvailable(parentRow as DirectMaterial, sub as DirectMaterialSubItem) }}</span>
                  </template>
                </el-table-column>
                <el-table-column label="批次" width="80" align="center">
                  <template #default="{ row: sub }">
                    <el-tag type="danger" size="small" effect="plain">{{ matchInventory(parentRow as DirectMaterial, sub as DirectMaterialSubItem).length }} 批</el-tag>
                  </template>
                </el-table-column>
                <template #empty>
                  <el-empty description="该记录暂无有可用库存的子项" :image-size="60" />
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
            <el-tag :type="row.subItemCount ? 'danger' : 'info'" size="small" effect="plain">{{ row.subItemCount || 0 }} 项</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 区块二：报废购物车 + 提交表单 -->
    <el-card shadow="never" class="cart-card">
      <template #header>
        <div class="card-header">
          <span>
            <el-icon class="danger-icon"><Delete /></el-icon> 待报废清单
            <el-badge :value="cart.length" type="danger" class="badge-gap" />
          </span>
          <span class="count-text">
            共 {{ cart.reduce((s, c) => s + c.scrapQty, 0) }} 件
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
        <el-table-column label="报废数量" min-width="110" align="center" class-name="highlight-qty">
          <template #default="{ row }">
            <el-input-number v-model="row.scrapQty" :min="1" :max="Math.max(1, availableExcluding(row, row))" size="small" class="qty-input" />
          </template>
        </el-table-column>
        <el-table-column prop="unit" label="单位" min-width="50" align="center" />
        <el-table-column prop="inboundTime" label="入库时间" min-width="130" show-overflow-tooltip>
          <template #default="{ row }">{{ formatTime(row.inboundTime) }}</template>
        </el-table-column>
        <el-table-column prop="inboundNo" label="入库单号" min-width="120" show-overflow-tooltip />
        <el-table-column label="报废前可用" min-width="90" align="right">
          <template #default="{ row }">
            <span :class="availableExcluding(row, row) > 0 ? '' : 'zero-value'">{{ availableExcluding(row, row) }}</span>
          </template>
        </el-table-column>
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
      <el-empty v-else description="请从上方检索区逐级展开主记录、子项与入库批次，添加需要报废的物料" />

      <!-- 提交表单 -->
      <el-form :model="form" label-width="100px" class="submit-form" v-if="cart.length > 0">
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="报废单号" required>
              <el-input v-model="form.scrapOrderNo" placeholder="请填写报废单号" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="报废凭证" required>
              <el-upload v-model:file-list="fileList" :auto-upload="false" multiple>
                <el-button type="primary" plain size="small">选择文件</el-button>
              </el-upload>
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
            <el-button type="danger" size="large" @click="submit" :loading="submitting">
              <el-icon><Promotion /></el-icon> 提交报废并流转审批
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
import type { UploadUserFile } from 'element-plus'
import { Search, Delete, Promotion } from '@element-plus/icons-vue'
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

// 库存索引（用于子项/批次可用库存计算）
const allInventory = ref<InventoryItem[]>([])
const lockedMap = ref<Record<string, number>>({})

// 子项懒加载缓存
const subCache = reactive<Record<number, DirectMaterialSubItem[]>>({})
const subLoading = reactive<Record<number, boolean>>({})
// 每个批次的报废数量输入: key = `${parentId}-${subId}-${inboundNo}`
const batchQtyInputs = reactive<Record<string, number>>({})

interface CartItem extends InventoryItem { scrapQty: number }
const cart = ref<CartItem[]>([])
const fileList = ref<UploadUserFile[]>([])
const form = reactive({ scrapOrderNo: '', approver: '' })
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

// ==================== 主记录检索（有货过滤） ====================
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
    // 预拉全部主记录子项，仅保留至少一个子项有可用库存的主记录（报废出库只展示有货物料）
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

// ==================== 子项展开（懒加载兜底） ====================
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
    const stocked = (res.data || []).filter(s => baseAvailable(materialList.value.find(m => m.id === parentId) as DirectMaterial, s) > 0)
    subCache[parentId] = stocked
    const target = materialList.value.find(m => m.id === parentId)
    if (target) target.subItemCount = stocked.length
  } finally {
    subLoading[parentId] = false
  }
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

// 子项可用库存（含购物车占用预扣）
function subAvailable(parent: DirectMaterial, sub: DirectMaterialSubItem): number {
  let total = 0
  for (const inv of matchInventory(parent, sub)) {
    const inCart = cart.value.filter(c => c.inboundNo === inv.inboundNo).reduce((s, c) => s + c.scrapQty, 0)
    total += Math.max(0, getAvailable(inv) - inCart)
  }
  return total
}

// 单个批次可用库存（含购物车占用预扣）
function batchAvailable(inv: InventoryItem): number {
  const inCart = cart.value.filter(c => c.inboundNo === inv.inboundNo).reduce((s, c) => s + c.scrapQty, 0)
  return Math.max(0, getAvailable(inv) - inCart)
}

// 批次可新增/可编辑上限：扣除其他购物车行的占用（排除 exclude 自身，使其能编辑回原值）
function availableExcluding(invItem: unknown, excludeItem: unknown): number {
  const inv = invItem as InventoryItem
  const exclude = excludeItem as InventoryItem
  const others = cart.value
    .filter(c => c.inboundNo === inv.inboundNo && c !== exclude)
    .reduce((s, c) => s + c.scrapQty, 0)
  return Math.max(0, getAvailable(inv) - others)
}

// ==================== 加购（按批次，用户自选） ====================
function addBatchToCart(parent: DirectMaterial, sub: DirectMaterialSubItem, inv: InventoryItem) {
  const key = `${parent.id}-${sub.id}-${inv.inboundNo}`
  const qty = batchQtyInputs[key] || 1
  const available = availableExcluding(inv, inv)
  if (qty <= 0 || qty > available) {
    ElMessage.error(`该批次可用库存不足（可加购上限 ${available}）`)
    return
  }
  const existing = cart.value.find(c => c.inboundNo === inv.inboundNo)
  if (existing) {
    existing.scrapQty += qty
  } else {
    cart.value.push({ ...inv, scrapQty: qty })
  }
  ElMessage.success(`已添加 ${qty} 件 [${sub.purchaseDescription || sub.sapDrawingNo || '未知物料'}]（批次 ${inv.inboundNo}）到报废清单`)
  delete batchQtyInputs[key]
}

// ==================== 提交 ====================
async function submit() {
  if (!form.scrapOrderNo.trim()) { ElMessage.error('请填写报废单号'); return }
  if (fileList.value.length === 0) { ElMessage.error('请上传报废凭证附件'); return }
  if (!form.approver) { ElMessage.error('请选择审批经理'); return }
    
  // V2.6：不再自动匹配，直接使用用户选择的 approver
    
  submitting.value = true
  try {
    const res = await submitOutboundFlow('outbound_scrap', {
      items: cart.value.map(c => ({
        inboundNo: c.inboundNo, materialName: c.materialName, materialCode: c.materialCode,
        scrapQty: c.scrapQty, unit: c.unit, warehouse: c.warehouse, location: c.location,
      })),
      scrapOrderNo: form.scrapOrderNo,
      attachments: fileList.value.map(f => f.name),
      applicant: auth.userName,
      department: auth.user?.department || '',
      approver: form.approver,
    })
    if (res.code === 200) {
      ElMessage.success(`报废出库申请 ${res.data.flowNo} 已成功提交审批`)
      cart.value = []
      form.scrapOrderNo = ''
      fileList.value = []
      await loadData()
    }
  } catch (e) {
    ElMessage.error('提交失败')
  } finally { submitting.value = false }
}

onMounted(() => { loadData() })
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
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
.aging-warn {
  color: var(--el-color-warning);
  font-weight: 600;
}
.dormant-warn {
  color: var(--el-color-danger);
  font-weight: 600;
}
.qty-input {
  width: 90px;
}
.cart-card {
  margin-top: 16px;
}
.danger-icon {
  color: var(--el-color-danger);
}
.badge-gap {
  margin-left: 8px;
}
.count-text {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
:deep(.highlight-qty .cell) {
  font-weight: bold;
  color: var(--el-color-danger);
}
.submit-form {
  margin-top: 20px;
}
.text-right {
  text-align: right;
}
/* 子项/批次展开区（与领用出库一致） */
.sub-item-panel { padding: 12px 16px 16px 48px; background: var(--el-fill-color-light); }
.batch-panel { padding: 8px 12px 12px 36px; background: var(--el-fill-color-lighter); }
.sub-toolbar { display: flex; align-items: center; margin-bottom: 10px; }
.sub-title { font-size: 13px; font-weight: 600; color: var(--el-text-color-primary); }
.sub-table { width: 100%; }
.code-text { font-family: monospace; letter-spacing: 0.5px; }
</style>
