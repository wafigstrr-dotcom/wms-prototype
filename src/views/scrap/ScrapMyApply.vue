<template>
  <div class="scrap-my-apply">
    <div v-if="loading" class="loading-block">
      <el-icon class="is-loading" :size="24"><Loading /></el-icon>
      <span class="loading-text">加载中...</span>
    </div>
    <div v-else-if="flowList.length === 0" class="empty-state">
      <el-icon :size="48" class="empty-icon"><Box /></el-icon>
      <p>暂无申请记录</p>
    </div>
    <div v-else class="card-list">
      <el-card
        v-for="flow in flowList"
        :key="flow.id"
        shadow="never"
        class="apply-card"
        :class="{ 'apply-card--rejected': flow.currentStep === 'rejected' }"
      >
        <div class="card-row">
          <div>
            <div class="card-title">{{ flow.flowNo }}</div>
            <div class="card-meta">
              申请时间：{{ formatDate(flow.createTime) }} | 物料数：{{ getItemsCount(flow) }} 项
            </div>
          </div>
          <el-tag :type="statusTagType(flow)" size="large">
            {{ statusLabel(flow) }}
          </el-tag>
        </div>
        <div class="card-body">
          残值合计：<span class="danger-value">¥{{ getRemaining(flow) }}</span>
          | 报废原因：{{ truncate(flow.data.reason as string, 50) }}
        </div>
        <div class="card-footer">
          <el-button size="small" @click="openDetail(flow)">
            <el-icon><View /></el-icon> 查看详情
          </el-button>
        </div>
      </el-card>
    </div>

    <!-- 详情弹窗 -->
    <el-dialog v-model="dialogVisible" title="报废申请详情" width="800px" top="5vh">
      <div v-if="selectedFlow" class="detail-wrapper">
        <!-- 基本信息 -->
        <div class="detail-section">
          <div class="detail-flow-no">流程单号：{{ selectedFlow.flowNo }}</div>
          <div class="detail-meta">
            申请人：{{ selectedFlow.creator }} |
            部门经理：{{ selectedFlow.data.approverName || '-' }}
            <template v-if="selectedFlow.data.approverGm"> | 总监：{{ selectedFlow.data.approverGm }}</template>
            <template v-if="selectedFlow.data.approverFinance"> | 财务总监：{{ selectedFlow.data.approverFinance }}</template>
            | 申请时间：{{ formatDate(selectedFlow.createTime) }}
          </div>
          <div class="detail-status">
            <el-tag :type="statusTagType(selectedFlow)">{{ statusLabel(selectedFlow) }}</el-tag>
          </div>
        </div>

        <!-- 审批进度 -->
        <div class="detail-section">
          <div class="section-title">审批进度</div>
          <el-steps :active="progressActive" finish-status="success" align-center>
            <el-step
              v-for="step in progressSteps"
              :key="step.key"
              :title="step.label"
              :status="stepStatus(step.key)"
            />
          </el-steps>
        </div>

        <!-- 物料清单 -->
        <div class="detail-section">
          <div class="section-title">物料清单</div>
          <el-table :data="detailItems" border size="small">
            <el-table-column type="index" label="序号" width="50" />
            <el-table-column prop="materialCode" label="物料编号" min-width="120" />
            <el-table-column prop="partDesc" label="零件描述" min-width="100" />
            <el-table-column prop="exempt3C" label="免3C" width="70" />
            <el-table-column prop="confidential" label="保密拆解" width="80" />
            <el-table-column prop="qty" label="数量" width="70" />
            <el-table-column prop="originalValue" label="原值" width="80" />
            <el-table-column prop="remainingValue" label="残值" width="80" />
            <el-table-column prop="projectOrCost" label="项目号" width="100" />
          </el-table>
          <div class="detail-totals">
            合计：数量 {{ selectedFlow.data.totalQty }} | 原值 ¥{{ selectedFlow.data.totalOriginal }} | 残值 ¥{{ selectedFlow.data.totalRemaining }}
          </div>
        </div>

        <!-- 报废原因 -->
        <div class="detail-section">
          <div class="section-title">报废原因</div>
          <div class="detail-text-block">{{ selectedFlow.data.reason }}</div>
        </div>

        <!-- 处理方式 -->
        <div class="detail-section">
          <div class="section-title">建议处理方式</div>
          <div>{{ formatDisposeTypes(selectedFlow.data.disposeTypes as string[]) }}{{ selectedFlow.data.disposeCostProject ? `（项目号：${selectedFlow.data.disposeCostProject}）` : '' }}</div>
        </div>

        <!-- 附件 -->
        <div class="detail-section">
          <div class="section-title">报废凭证附件</div>
          <div v-if="detailAttachments.length > 0" class="attachment-list">
            <el-tag v-for="name in detailAttachments" :key="name" size="small" type="info" class="attachment-tag">
              <el-icon><Paperclip /></el-icon> {{ name }}
            </el-tag>
          </div>
          <span v-else class="placeholder-text">无附件</span>
        </div>

        <!-- 审批记录 -->
        <div class="detail-section">
          <div class="section-title">审批记录</div>
          <div v-if="selectedFlow.approvalHistory.length > 0">
            <div v-for="(h, i) in selectedFlow.approvalHistory" :key="i" class="history-item">
              <strong>{{ stepLabels[h.step] || h.step }}</strong> — {{ h.approver }} —
              <el-tag :type="h.result === 'approved' ? 'success' : 'danger'" size="small">
                {{ h.result === 'approved' ? '通过' : '驳回' }}
              </el-tag>
              <div v-if="h.comment" class="history-comment">备注：{{ h.comment }}</div>
              <div class="history-time">{{ formatDate(h.time) }}</div>
            </div>
          </div>
          <span v-else class="placeholder-text-sm">暂无审批记录</span>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Loading, Box, View, Paperclip } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { getAllFlows } from '@/api/flows.api'
import type { FlowItem } from '@/api/flows.api'

const authStore = useAuthStore()

const loading = ref(false)
const flowList = ref<FlowItem[]>([])
const dialogVisible = ref(false)
const selectedFlow = ref<FlowItem | null>(null)

const stepLabels: Record<string, string> = {
  manager: '部门经理审批',
  gm: '总监审批',
  finance: '财务总监审批',
  keeper: '仓管处理',
  completed: '已完成',
  rejected: '已驳回',
}

function statusTagType(flow: FlowItem) {
  if (flow.currentStep === 'rejected') return 'danger'
  if (flow.currentStep === 'completed') return 'success'
  if (flow.currentStep === 'keeper') return 'success'
  return 'warning'
}

function statusLabel(flow: FlowItem) {
  if (flow.currentStep === 'rejected') return '已驳回'
  if (flow.currentStep === 'completed') return '已完成'
  return stepLabels[flow.currentStep || ''] || flow.currentStep || '未知'
}

function getItemsCount(flow: FlowItem) {
  return ((flow.data.items as unknown[]) || []).length
}

function getRemaining(flow: FlowItem) {
  return flow.data.totalRemaining || '0.00'
}

function truncate(str: string, len: number) {
  if (!str) return ''
  return str.length > len ? str.substring(0, len) + '...' : str
}

function formatDate(iso: string) {
  if (!iso) return '-'
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

function formatDisposeTypes(types: string[]) {
  const map: Record<string, string> = { noIncome: '无收益报废', auction: '有收益拍卖', cost: '新增处置费用计入', other: '其他' }
  return (types || []).map(t => map[t] || t).join('、') || '-'
}

const detailItems = computed(() => {
  if (!selectedFlow.value) return []
  return (selectedFlow.value.data.items as Record<string, unknown>[]) || []
})

const detailAttachments = computed(() => {
  if (!selectedFlow.value) return []
  return (selectedFlow.value.data.attachments as string[]) || []
})

const progressSteps = computed(() => {
  if (!selectedFlow.value) return []
  const totalRemaining = Number(selectedFlow.value.data.totalRemaining) || 0
  const steps = [{ key: 'manager', label: (selectedFlow.value.data.approverName as string) || '部门经理' }]
  if (totalRemaining >= 5000) steps.push({ key: 'gm', label: (selectedFlow.value.data.approverGm as string) || '总监' })
  if (totalRemaining >= 3000) steps.push({ key: 'finance', label: (selectedFlow.value.data.approverFinance as string) || '财务总监' })
  steps.push({ key: 'keeper', label: '仓管处理' })
  steps.push({ key: 'completed', label: '完成' })
  return steps
})

const progressActive = computed(() => {
  if (!selectedFlow.value) return 0
  const step = selectedFlow.value.currentStep || ''
  if (step === 'rejected') return -1
  const idx = progressSteps.value.findIndex(s => s.key === step)
  if (idx === -1) return progressSteps.value.length
  return idx
})

function stepStatus(key: string) {
  if (!selectedFlow.value) return ''
  const current = selectedFlow.value.currentStep || ''
  if (current === 'rejected') {
    const completedSteps = (selectedFlow.value.approvalHistory || [])
      .filter(h => h.result === 'approved')
      .map(h => h.step)
    return completedSteps.includes(key) ? 'success' : ''
  }
  if (current === 'completed') return 'success'
  const completedSteps = (selectedFlow.value.approvalHistory || [])
    .filter(h => h.result === 'approved')
    .map(h => h.step)
  if (completedSteps.includes(key)) return 'success'
  if (current === key) return 'process'
  return 'wait'
}

function openDetail(flow: FlowItem) {
  selectedFlow.value = flow
  dialogVisible.value = true
}

async function refresh() {
  loading.value = true
  try {
    const res = await getAllFlows({ type: 'scrap_workflow', creator: authStore.user?.name })
    flowList.value = res.data?.list || []
  } catch {
    flowList.value = []
  } finally {
    loading.value = false
  }
}

defineExpose({ refresh })
onMounted(() => refresh())
</script>

<style scoped>
.loading-block {
  text-align: center;
  padding: 40px;
}
.loading-text {
  margin-left: 8px;
}
.empty-icon {
  opacity: 0.3;
}
.detail-status {
  margin-top: 8px;
}
.attachment-tag {
  margin-right: 8px;
  margin-bottom: 4px;
}
.placeholder-text {
  color: var(--el-text-color-placeholder);
}
.placeholder-text-sm {
  color: var(--el-text-color-placeholder);
  font-size: 13px;
}
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--el-text-color-placeholder);
}
.card-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.apply-card {
  border-left: 4px solid var(--el-color-primary);
}
.apply-card--rejected {
  border-left-color: var(--el-color-warning);
}
.card-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}
.card-title {
  font-weight: 600;
  font-size: 15px;
}
.card-meta {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}
.card-body {
  font-size: 13px;
  margin-bottom: 8px;
}
.danger-value {
  color: var(--el-color-danger);
  font-weight: 600;
}
.card-footer {
  display: flex;
  justify-content: flex-end;
}
.detail-wrapper {
  max-height: 70vh;
  overflow-y: auto;
  padding-right: 8px;
}
.detail-section {
  margin-bottom: 20px;
}
.section-title {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 8px;
}
.detail-flow-no {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 4px;
}
.detail-meta {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
.detail-totals {
  text-align: right;
  font-size: 13px;
  font-weight: 600;
  margin-top: 8px;
}
.detail-text-block {
  padding: 10px;
  background: var(--el-fill-color-light);
  border-radius: 4px;
  font-size: 13px;
  line-height: 1.6;
}
.history-item {
  padding: 8px;
  margin-bottom: 8px;
  background: var(--el-fill-color-light);
  border-radius: 4px;
  font-size: 13px;
}
.history-comment {
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}
.history-time {
  color: var(--el-text-color-placeholder);
  font-size: 12px;
  margin-top: 4px;
}
</style>
