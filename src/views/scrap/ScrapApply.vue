<template>
  <div class="scrap-apply">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <el-icon :size="18"><Document /></el-icon>
          <span>报废物料清单</span>
        </div>
      </template>

      <!-- 物料动态表 -->
      <el-table :data="rows" border size="small" class="full-table">
        <el-table-column label="物料编号或系列号" min-width="160">
          <template #default="{ row }">
            <el-input v-model="row.materialCode" placeholder="请输入" size="small" />
          </template>
        </el-table-column>
        <el-table-column label="零件描述" min-width="140">
          <template #default="{ row }">
            <el-input v-model="row.partDesc" placeholder="请输入" size="small" />
          </template>
        </el-table-column>
        <el-table-column label="免3C" width="100">
          <template #default="{ row }">
            <el-select v-model="row.exempt3C" placeholder="请选择" size="small">
              <el-option label="是" value="是" />
              <el-option label="否" value="否" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="保密拆解" width="100">
          <template #default="{ row }">
            <el-select v-model="row.confidential" placeholder="请选择" size="small">
              <el-option label="是" value="是" />
              <el-option label="否" value="否" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="数量" width="90">
          <template #default="{ row }">
            <el-input-number v-model="row.qty" :min="0" :precision="0" size="small" controls-position="right" class="full-width" />
          </template>
        </el-table-column>
        <el-table-column label="物料原值(元)" width="120">
          <template #default="{ row }">
            <el-input-number v-model="row.originalValue" :min="0" :precision="2" size="small" controls-position="right" class="full-width" />
          </template>
        </el-table-column>
        <el-table-column label="估计剩余价值(元)" width="140">
          <template #default="{ row }">
            <el-input-number v-model="row.remainingValue" :min="0" :precision="2" size="small" controls-position="right" class="full-width" />
          </template>
        </el-table-column>
        <el-table-column label="所属项目号或成本中心" min-width="150">
          <template #default="{ row }">
            <el-input v-model="row.projectOrCost" placeholder="请输入" size="small" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ $index }">
            <el-button type="primary" :icon="Plus" size="small" circle @click="addRow" />
            <el-button type="danger" :icon="Minus" size="small" circle @click="removeRow($index)" :disabled="rows.length <= 1" />
          </template>
        </el-table-column>
      </el-table>

      <!-- 合计行 -->
      <div class="totals-bar">
        <span>合计：数量 <strong>{{ totalQty }}</strong></span>
        <span>原值 <strong>¥{{ totalOriginal.toFixed(2) }}</strong></span>
        <span>残值 <strong class="danger-text">¥{{ totalRemaining.toFixed(2) }}</strong></span>
      </div>

      <!-- 物料处置说明 -->
      <el-alert
        type="info"
        :closable="false"
        class="info-alert"
      >
        <template #title>说明</template>
        <ol class="note-list">
          <li>所处置的物料范围包括各种已经费用化的零部件、样机、工装及不属于固定资产的低值易耗品（比如小工具）等。</li>
          <li>对于一些特殊物料的处理，需和废料处理部门预先沟通后再确定处理方式。</li>
          <li>如处理机组或物料涉及到免3C管理，处理申请单上"免3C"栏需要填写"是"，反之填"否"。</li>
          <li>如处理机组或物料涉及到保密要求需要拆解处理，处理申请单上"保密拆解"栏需要填写"是"，反之填"否"。</li>
        </ol>
      </el-alert>
    </el-card>

    <!-- 报废原因 + 处理方式 + 附件 + 审批人 -->
    <el-card shadow="never" class="form-card">
      <el-form label-position="top">
        <!-- 报废原因 -->
        <el-form-item label="报废原因" required>
          <el-input v-model="scrapReason" type="textarea" :rows="3" placeholder="请详细填写报废原因..." />
        </el-form-item>

        <!-- 建议处理方式 -->
        <el-form-item label="建议处理方式" required>
          <div class="dispose-options">
            <el-checkbox v-model="disposeNoIncome">无收益报废</el-checkbox>
            <el-checkbox v-model="disposeAuction">有收益拍卖</el-checkbox>
            <div class="dispose-option-inline">
              <el-checkbox v-model="disposeCost">新增处置费用计入（项目号）</el-checkbox>
              <el-input v-model="disposeCostProject" placeholder="请输入项目号" size="small" class="project-input" :disabled="!disposeCost" />
            </div>
            <el-checkbox v-model="disposeOther">其他</el-checkbox>
          </div>
        </el-form-item>

        <!-- 上传报废凭证 -->
        <el-form-item label="上传报废凭证" required>
          <el-upload
            ref="uploadRef"
            :auto-upload="false"
            :file-list="fileList"
            :on-change="onFileChange"
            :on-remove="onFileRemove"
            multiple
            accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
          >
            <el-button type="primary" plain :icon="Upload">选择文件</el-button>
            <template #tip>
              <div class="el-upload__tip">支持 jpg/png/pdf/doc 格式，可多选上传</div>
            </template>
          </el-upload>
        </el-form-item>

        <!-- 审批人 -->
        <el-form-item label="部门经理审批人" required>
          <el-input v-model="approverManager" placeholder="请输入部门经理姓名" class="approver-input" />
        </el-form-item>
        <el-form-item v-if="totalRemaining >= 5000" label="总监审批人" required>
          <el-input v-model="approverGm" placeholder="请输入总监姓名" class="approver-input" />
        </el-form-item>
        <el-form-item v-if="totalRemaining >= 3000" label="财务总监审批人" required>
          <el-input v-model="approverFinance" placeholder="请输入财务总监姓名" class="approver-input" />
        </el-form-item>

        <!-- 审批路径提示 -->
        <div class="approval-route-hint">
          <el-icon><Promotion /></el-icon>
          审批路径：<strong>{{ approverManager || '部门经理' }}</strong>
          <template v-if="totalRemaining >= 5000"> → 总监审批 → 财务总监审批 → 仓管处理</template>
          <template v-else-if="totalRemaining >= 3000"> → 财务总监审批 → 仓管处理</template>
          <template v-else> → 仓管处理</template>
        </div>
      </el-form>

      <div class="form-actions">
        <el-button @click="resetForm">重置</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm">
          提交报废申请
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Plus, Minus, Upload, Promotion, Document } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { UploadFile } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { createFlow } from '@/api/flows.api'

const authStore = useAuthStore()

interface ScrapRow {
  materialCode: string
  partDesc: string
  exempt3C: string
  confidential: string
  qty: number
  originalValue: number
  remainingValue: number
  projectOrCost: string
}

function createEmptyRow(): ScrapRow {
  return { materialCode: '', partDesc: '', exempt3C: '', confidential: '', qty: 0, originalValue: 0, remainingValue: 0, projectOrCost: '' }
}

const rows = ref<ScrapRow[]>([createEmptyRow()])

const scrapReason = ref('')
const disposeNoIncome = ref(false)
const disposeAuction = ref(false)
const disposeCost = ref(false)
const disposeCostProject = ref('')
const disposeOther = ref(false)

const fileList = ref<UploadFile[]>([])
const approverManager = ref('')
const approverGm = ref('')
const approverFinance = ref('')
const submitting = ref(false)
const uploadRef = ref()

const totalQty = computed(() => rows.value.reduce((sum, r) => sum + (r.qty || 0), 0))
const totalOriginal = computed(() => rows.value.reduce((sum, r) => sum + (r.originalValue || 0), 0))
const totalRemaining = computed(() => rows.value.reduce((sum, r) => sum + (r.remainingValue || 0), 0))

function addRow() {
  rows.value.push(createEmptyRow())
}

function removeRow(index: number) {
  if (rows.value.length <= 1) return
  rows.value.splice(index, 1)
}

function onFileChange(file: UploadFile) {
  fileList.value.push(file)
}

function onFileRemove(file: UploadFile) {
  const idx = fileList.value.findIndex(f => f.uid === file.uid)
  if (idx !== -1) fileList.value.splice(idx, 1)
}

function resetForm() {
  rows.value = [createEmptyRow()]
  scrapReason.value = ''
  disposeNoIncome.value = false
  disposeAuction.value = false
  disposeCost.value = false
  disposeCostProject.value = ''
  disposeOther.value = false
  fileList.value = []
  approverManager.value = ''
  approverGm.value = ''
  approverFinance.value = ''
  if (uploadRef.value) uploadRef.value.clearFiles()
}

async function submitForm() {
  const validRows = rows.value.filter(r => r.materialCode.trim())
  if (validRows.length === 0) {
    ElMessage.error('请至少填写一行物料信息（物料编号为必填）')
    return
  }
  if (!scrapReason.value.trim()) {
    ElMessage.error('请填写报废原因')
    return
  }
  const disposeTypes: string[] = []
  if (disposeNoIncome.value) disposeTypes.push('noIncome')
  if (disposeAuction.value) disposeTypes.push('auction')
  if (disposeCost.value) disposeTypes.push('cost')
  if (disposeOther.value) disposeTypes.push('other')
  if (disposeTypes.length === 0) {
    ElMessage.error('请至少选择一种建议处理方式')
    return
  }
  if (disposeCost.value && !disposeCostProject.value.trim()) {
    ElMessage.error('请填写新增处置费用计入的项目号')
    return
  }
  if (fileList.value.length === 0) {
    ElMessage.error('请上传至少一个报废凭证文件')
    return
  }
  if (!approverManager.value.trim()) {
    ElMessage.error('请填写部门经理审批人')
    return
  }
  if (totalRemaining.value >= 5000 && !approverGm.value.trim()) {
    ElMessage.error('残值≥5000，请填写总监审批人')
    return
  }
  if (totalRemaining.value >= 3000 && !approverFinance.value.trim()) {
    ElMessage.error('残值≥3000，请填写财务总监审批人')
    return
  }

  submitting.value = true
  try {
    const fileNames = fileList.value.map(f => f.name)
    const user = authStore.user
    await createFlow({
      type: 'scrap_workflow',
      creator: user?.name || '未知',
      creatorId: user?.id || 0,
      status: 'pending',
      currentStep: 'manager',
      approver: approverManager.value,
      data: {
        items: validRows,
        reason: scrapReason.value,
        disposeTypes,
        disposeCostProject: disposeCostProject.value,
        totalQty: totalQty.value,
        totalOriginal: totalOriginal.value.toFixed(2),
        totalRemaining: totalRemaining.value.toFixed(2),
        approverName: approverManager.value,
        approverGm: totalRemaining.value >= 5000 ? approverGm.value : '',
        approverFinance: totalRemaining.value >= 3000 ? approverFinance.value : '',
        attachments: fileNames,
        department: user?.department || '',
      },
    })
    ElMessage.success('报废申请已提交！')
    resetForm()
  } catch {
    ElMessage.error('提交失败')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}
.full-table {
  width: 100%;
}
.full-width {
  width: 100%;
}
.danger-text {
  color: var(--el-color-danger);
}
.info-alert {
  margin-top: 16px;
}
.note-list {
  margin: 0;
  padding-left: 20px;
  line-height: 1.8;
}
.form-card {
  margin-top: 16px;
}
.project-input {
  width: 180px;
  margin-left: 8px;
}
.approver-input {
  max-width: 300px;
}
.totals-bar {
  display: flex;
  gap: 24px;
  justify-content: flex-end;
  padding: 12px 0;
  font-size: 14px;
}
.dispose-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.dispose-option-inline {
  display: flex;
  align-items: center;
}
.approval-route-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 16px;
  background: var(--el-fill-color-light);
  border-radius: 8px;
  font-size: 13px;
  margin-top: 8px;
}
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--el-border-color-lighter);
  margin-top: 16px;
}
</style>
