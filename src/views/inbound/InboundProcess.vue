<template>
  <div class="inbound-process">
    <!-- 待办列表 -->
    <el-card shadow="never" class="todo-card">
      <template #header>
        <div class="card-header">
          <el-icon><List /></el-icon> 待办入库审核
          <el-tag size="small" type="warning" class="todo-count">{{ pendingList.length }}</el-tag>
        </div>
      </template>

      <el-table :data="pendingList" stripe v-loading="loading" class="full-width">
        <el-table-column prop="flowNo" label="审批单号" width="160" />
        <el-table-column label="申请摘要" min-width="250">
          <template #default="{ row }">
            <div class="summary-row">
              <span class="po-tags">PO: 
                <span v-for="(po, idx) in ((row as FlowItem).data?.poNos || []) as any[]" :key="po" class="po-tag-small">{{ po }}{{ (idx as number) < (((row as FlowItem).data?.poNos || []) as any[]).length - 1 ? '、' : '' }}</span>
              </span>
              <span class="item-desc">{{ getItemsSummary(row as unknown) }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="申请人" width="120">
          <template #default="{ row }">{{ (row as FlowItem).data.applicant }}</template>
        </el-table-column>
        <el-table-column label="入库原因" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">{{ (row as FlowItem).data.inboundReason || '-' }}</template>
        </el-table-column>
        <el-table-column label="申请时间" width="160">
          <template #default="{ row }">{{ formatDate((row as FlowItem).createTime) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right" align="center">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="openProcessDialog(row as FlowItem)">
              处理
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!loading && pendingList.length === 0" description="暂无入库待办" />
    </el-card>

    <!-- 处理弹窗 -->
    <el-dialog v-model="dialogVisible" title="补充仓储信息并确认入库" width="800px" destroy-on-close>
      <div v-if="currentFlow" class="dialog-content">
        <!-- 只读信息区 -->
        <div class="section-title">
          <el-icon><Document /></el-icon> 工程师提交信息 (只读)
        </div>
        <el-descriptions :column="2" border size="small" class="readonly-desc">
          <el-descriptions-item label="PO号">
            <span v-for="po in (currentFlow.data.poNos || [])" :key="po" class="po-tag-small">{{ po }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="入库原因">{{ currentFlow.data.inboundReason || '-' }}</el-descriptions-item>
          <el-descriptions-item label="申请人">{{ currentFlow.data.applicant }}</el-descriptions-item>
          <el-descriptions-item label="部门">{{ currentFlow.data.department }}</el-descriptions-item>
        </el-descriptions>

        <!-- 子项明细 + 仓库货位 -->
        <div class="section-title" style="margin-top: 24px;">
          <el-icon><Edit /></el-icon> 入库明细 & 仓储信息 (必填仓库/货位)
        </div>
        <el-table :data="flowItems" border size="small" class="items-table">
          <el-table-column type="index" label="序号" width="60" align="center" />
          <el-table-column prop="poNo" label="PO号" width="130">
            <template #default="{ row }"><span class="po-tag-small">{{ row.poNo }}</span></template>
          </el-table-column>
          <el-table-column prop="materialName" label="物料名称" min-width="180" show-overflow-tooltip />
          <el-table-column prop="sapDrawingNo" label="SAP号" width="130" />
          <el-table-column prop="inboundQty" label="入库数量" width="90" align="center" />
          <el-table-column label="仓库" width="160">
            <template #default="{ $index }">
              <el-select v-model="itemWarehouse[$index]" placeholder="请选择仓库" size="small" class="full-width">
                <el-option v-for="wh in warehouseOptions" :key="wh.id" :label="wh.name" :value="wh.name" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="货位" width="160">
            <template #default="{ $index }">
              <el-select v-model="itemLocation[$index]" :disabled="!itemWarehouse[$index]" :placeholder="itemWarehouse[$index] ? '请选择货位' : '先选仓库'" size="small" class="full-width">
                <el-option v-for="loc in getLocationOptions($index)" :key="loc" :label="loc" :value="loc" />
              </el-select>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="danger" @click="openRejectDialog">驳回</el-button>
        <el-button type="primary" :loading="submitting" :disabled="!isAllLocationFilled" @click="handleApprove">
          确认入库 ({{ flowItems.length }} 项)
        </el-button>
      </template>
    </el-dialog>

    <!-- 驳回弹窗 -->
    <el-dialog v-model="rejectDialogVisible" title="驳回工程师入库申请" width="600px" destroy-on-close>
      <div class="section-title">
        <el-icon><Warning /></el-icon> 请填写驳回原因
      </div>
      <el-input
        v-model="rejectReason"
        type="textarea"
        :rows="3"
        placeholder="请输入驳回原因（如：物料信息不准确、仓库货位未填等）供工程师参考"
      />
      <template #footer>
        <el-button @click="rejectDialogVisible = false">取消</el-button>
        <el-button type="danger" :loading="submitting" @click="handleReject">确认驳回</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { List, Document, Edit, Warning } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { getPendingFlows, approveFlow, rejectFlow, type FlowItem } from '@/api/flows.api'
import { addInventory } from '@/api/inventory.api'
import { getWarehouses, getLocations } from '@/api/inbound.api'
import { getDirectMaterials } from '@/api/directMaterial.api'
import type { DirectMaterial } from '@/types'

const authStore = useAuthStore()

// 列表状态
const loading = ref(false)
const pendingList = ref<FlowItem[]>([])

// 处理弹窗状态
const dialogVisible = ref(false)
const submitting = ref(false)
const currentFlow = ref<FlowItem | null>(null)

// 驳回弹窗状态
const rejectDialogVisible = ref(false)
const rejectReason = ref('')

// 子项列表（从 flow.data.items 读取）
interface FlowInboundItem {
  parentId: number
  subItemId: number
  poNo: string
  sapDrawingNo: string
  materialName: string
  inboundQty: number
  originalQty: number
}
const flowItems = ref<FlowInboundItem[]>([])

// 每项的仓库/货位选择
const itemWarehouse = ref<string[]>([])
const itemLocation = ref<string[]>([])

// 仓库选项
const warehouseOptions = ref<{ id: number; name: string }[]>([])
// 每个 item 的货位选项缓存：key = index
const locationOptionsMap = reactive<Record<number, string[]>>({})

// 计算：是否所有项都填了仓库和货位
const isAllLocationFilled = computed(() => {
  if (flowItems.value.length === 0) return false
  return flowItems.value.every((_, idx) => itemWarehouse.value[idx] && itemLocation.value[idx])
})

// P3: getItemsSummary - 获取申请摘要（PO 号 + 前 2 个物料名）
function getItemsSummary(flowItem: unknown): string {
  const f = flowItem as FlowItem
  const items = (f.data?.items || []) as any[]
  if (!items.length) return '-'
  const names = items.slice(0, 2).map((i: any) => i.materialName).join('、')
  const count = items.length > 2 ? `等${items.length}项` : `${items.length}项`
  return `${names} / ${count}`
}

// 加载列表
async function loadPending() {
  loading.value = true
  try {
    const res = await getPendingFlows()
    pendingList.value = res.data.list.filter(f => f.type === 'inbound_engineer')
  } catch {
    ElMessage.error('加载待办失败')
  } finally {
    loading.value = false
  }
}

// 加载仓库选项
async function loadWarehouses() {
  try {
    const res = await getWarehouses()
    warehouseOptions.value = res.data.list
  } catch {
    warehouseOptions.value = []
  }
}

// 根据仓库加载货位（按item index缓存）
async function loadLocationsForItem(index: number, warehouseName: string) {
  if (!warehouseName) {
    locationOptionsMap[index] = []
    return
  }
  try {
    const res = await getLocations({ warehouseName })
    locationOptionsMap[index] = res.data.list.map(l => l.locationCode)
  } catch {
    locationOptionsMap[index] = []
  }
}

function getLocationOptions(index: number): string[] {
  return locationOptionsMap[index] || []
}

// 监听仓库变化，加载对应货位
watch(itemWarehouse, (newVal) => {
  newVal.forEach((wh, idx) => {
    itemLocation.value[idx] = ''
    loadLocationsForItem(idx, wh)
  })
}, { deep: true })

// 打开弹窗
function openProcessDialog(row: FlowItem) {
  currentFlow.value = row
  const items = (row.data.items as FlowInboundItem[]) || []
  flowItems.value = items.map(item => ({
    parentId: item.parentId,
    subItemId: item.subItemId,
    poNo: item.poNo || '',
    sapDrawingNo: item.sapDrawingNo || '',
    materialName: item.materialName || '',
    inboundQty: item.inboundQty || 1,
    originalQty: item.originalQty || 0,
  }))
  // 初始化仓库/货位数组
  itemWarehouse.value = new Array(items.length).fill('')
  itemLocation.value = new Array(items.length).fill('')
  // 清空货位缓存
  for (const key of Object.keys(locationOptionsMap)) {
    delete locationOptionsMap[Number(key)]
  }
  dialogVisible.value = true
}

// 确认入库：逐项写入库存 + 完结流程
async function handleApprove() {
  if (!currentFlow.value) return
  if (!isAllLocationFilled.value) {
    ElMessage.warning('请为所有物料填写仓库和货位')
    return
  }

  const user = authStore.user
  if (!user) {
    ElMessage.error('用户未登录')
    return
  }

  submitting.value = true
  try {
    const inboundNos: string[] = []

    // 预拉直接物料主记录，按 parentId 回填库存台账字段（与仓管员直接入库同口径）
    const dmRes = await getDirectMaterials()
    const parentMap = new Map<number, DirectMaterial>()
    for (const dm of dmRes.data.list || []) parentMap.set(dm.id, dm)

    // 逐项写入库存台账
    for (let idx = 0; idx < flowItems.value.length; idx++) {
      const item = flowItems.value[idx]
      const parent = parentMap.get(item.parentId)
      // 单价 = 主记录金额 / 数量（保留2位小数，无法计算时为0）
      const unitPrice = parent && parent.quantity > 0
        ? Math.round((parent.amount / parent.quantity) * 100) / 100
        : 0
      const inventoryData = {
        materialName: item.materialName,
        materialCode: item.sapDrawingNo || '',
        projectCode: parent?.projectCode || '',
        pbu: parent?.pbu || '',
        exempt3C: parent?.exempt3C || '',
        materialCategory: '',
        owner: parent?.owner || parent?.applicant || currentFlow.value.data.applicant as string || '',
        department: parent?.department || currentFlow.value.data.department as string || '',
        poNumber: item.poNo,
        supplierCode: parent?.supplierCode || '',
        quantity: item.inboundQty,
        unit: '件',
        warehouse: itemWarehouse.value[idx],
        location: itemLocation.value[idx],
        unitPrice,
        applicant: user.name,
      }

      const res = await addInventory(inventoryData)
      if (res.code !== 200) {
        ElMessage.error(`第${idx + 1}项入库失败: ${res.message}`)
        return
      }
      inboundNos.push(res.data.inboundNo)
    }

    // 完结审批流程
    const commentObj = {
      items: flowItems.value.map((item, idx) => ({
        materialName: item.materialName,
        inboundQty: item.inboundQty,
        warehouse: itemWarehouse.value[idx],
        location: itemLocation.value[idx],
        inboundNo: inboundNos[idx],
      })),
      approver: user.name,
    }

    const flowRes = await approveFlow(currentFlow.value.id, {
      approver: user.name,
      comment: JSON.stringify(commentObj),
      nextStep: 'completed',
    })

    if (flowRes.code === 200) {
      ElMessage.success(`入库成功！共 ${inboundNos.length} 项已入库存台账`)
      dialogVisible.value = false
      loadPending()
    } else {
      ElMessage.error(flowRes.message || '流程完结失败')
    }
  } catch (err) {
    console.error(err)
    ElMessage.error('操作失败，请重试')
  } finally {
    submitting.value = false
  }
}

// ==================== 驳回处理 ====================
function openRejectDialog() {
  rejectReason.value = ''
  rejectDialogVisible.value = true
}

async function handleReject() {
  if (!rejectReason.value.trim()) {
    ElMessage.warning('请填写驳回原因')
    return
  }
  if (!currentFlow.value) return
  submitting.value = true
  try {
    const res = await rejectFlow(currentFlow.value.id, {
      approver: authStore.user?.name || '仓管员',
      comment: rejectReason.value.trim(),
    })
    if (res.code === 200) {
      ElMessage.success('已驳回工程师入库申请')
      dialogVisible.value = false
      rejectDialogVisible.value = false
      loadPending()
    } else {
      ElMessage.error(res.message || '驳回失败')
    }
  } catch {
    ElMessage.error('驳回失败，请重试')
  } finally {
    submitting.value = false
  }
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

onMounted(() => {
  loadPending()
  loadWarehouses()
})
</script>

<style scoped>
.full-width { width: 100%; }
.inbound-process { padding: 12px 0; }
.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: var(--jc-text-dark);
}
.todo-count { margin-left: 8px; }

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--jc-text-dark);
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.section-title .el-icon { color: var(--jc-accent-teal); }

.readonly-desc { margin-bottom: 24px; }

.po-tag-small {
  background: rgba(0, 128, 128, 0.1);
  color: var(--jc-accent-teal);
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 11px;
  font-family: monospace;
  font-weight: 600;
  margin-right: 4px;
}

.items-table { width: 100%; }

.summary-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.item-desc { color: var(--jc-text-secondary); font-size: 12px; }
</style>
