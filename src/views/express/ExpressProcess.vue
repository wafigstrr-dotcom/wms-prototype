<template>
  <div class="express-process">
    <!-- 待办列表 -->
    <div v-if="loading" class="loading-block">
      <el-icon :size="32" class="is-loading"><Loading /></el-icon>
      <p class="loading-text">加载中...</p>
    </div>

    <el-empty v-else-if="todoList.length === 0" description="暂无待处理的发运申请" :image-size="80" />

    <div v-else class="todo-list">
      <el-card
        v-for="item in todoList"
        :key="item.id"
        shadow="hover"
        class="todo-card"
      >
        <div class="todo-item">
          <div class="todo-icon">
            <el-icon :size="22"><Van /></el-icon>
          </div>
          <div class="todo-content">
            <div class="todo-title">{{ item.flowNo }} - {{ item.data.materialDesc }}</div>
            <div class="todo-meta">
              发运原因：{{ item.data.shipReason }}
              <el-divider direction="vertical" />
              收件人：{{ item.data.recipient }}
              <el-divider direction="vertical" />
              申请时间：{{ formatDate(item.createTime) }}
            </div>
          </div>
          <el-button type="primary" @click="openDialog(item)">
            <el-icon><Edit /></el-icon> 处理
          </el-button>
        </div>
      </el-card>
    </div>

    <!-- 处理弹窗 -->
    <el-dialog v-model="dialogVisible" title="处理快递发运" width="600px" destroy-on-close>
      <div v-if="currentFlow" class="process-dialog">
        <!-- 只读信息 -->
        <el-descriptions :column="1" border size="small" class="desc-block">
          <el-descriptions-item label="物料描述">{{ currentFlow.data.materialDesc }}</el-descriptions-item>
          <el-descriptions-item label="收货地址">{{ currentFlow.data.address }}</el-descriptions-item>
          <el-descriptions-item label="收件人">{{ currentFlow.data.recipient }}（{{ currentFlow.data.recipientPhone }}）</el-descriptions-item>
        </el-descriptions>

        <!-- 表单 -->
        <el-form ref="processFormRef" :model="processForm" :rules="processRules" label-width="100px">
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="快递单号" prop="trackingNumber">
                <el-input v-model="processForm.trackingNumber" placeholder="请输入快递单号" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="重量(kg)" prop="weight">
                <el-input-number v-model="processForm.weight" :min="0" :precision="2" class="full-width" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="件数" prop="pieces">
                <el-input-number v-model="processForm.pieces" :min="1" class="full-width" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="金额(元)" prop="amount">
                <el-input-number v-model="processForm.amount" :min="0" :precision="2" class="full-width" />
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>

        <!-- 文件上传（原型阶段仅 UI 展示） -->
        <div class="file-upload-section">
          <div class="file-upload-title">文件上传</div>
          <div class="file-upload-grid">
            <div
              v-for="fileItem in FILE_ITEMS"
              :key="fileItem.key"
              class="file-upload-item"
              :class="{ 'has-file': uploadedFiles[fileItem.key] }"
              @click="triggerFileInput(fileItem.key)"
            >
              <el-icon :size="24"><component :is="fileItem.icon" /></el-icon>
              <div class="file-upload-item-title">{{ fileItem.label }}</div>
              <div class="file-upload-item-hint">
                {{ uploadedFiles[fileItem.key] || '点击上传' }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="processing" @click="handleProcess">
          确认处理
        </el-button>
      </template>
    </el-dialog>

    <!-- 隐藏的文件 input -->
    <input
      ref="fileInputRef"
      type="file"
      accept=".pdf,.jpg,.png,.xlsx,.xls"
      class="hidden-input"
      @change="handleFileChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, type FormInstance } from 'element-plus'
import { Van, Edit, Loading } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { getPendingFlows, approveFlow, type FlowItem } from '@/api/flows.api'

const authStore = useAuthStore()

const loading = ref(false)
const todoList = ref<FlowItem[]>([])
const dialogVisible = ref(false)
const currentFlow = ref<FlowItem | null>(null)
const processing = ref(false)
const processFormRef = ref<FormInstance>()
const fileInputRef = ref<HTMLInputElement>()
const currentFileKey = ref('')

const uploadedFiles = reactive<Record<string, string>>({
  approvalEmail: '',
  costDetail: '',
  sapTemplate: '',
  invoice: '',
})

const FILE_ITEMS = [
  { key: 'approvalEmail', label: '快递费用审批邮件', icon: 'Document', accept: '.pdf,.jpg,.png' },
  { key: 'costDetail', label: '快递费用明细清单', icon: 'DataAnalysis', accept: '.xlsx,.xls' },
  { key: 'sapTemplate', label: 'SAP YRP 会计模板', icon: 'DataAnalysis', accept: '.xlsx,.xls' },
  { key: 'invoice', label: '发票', icon: 'Coin', accept: '.pdf,.jpg,.png' },
]

const processForm = reactive({
  trackingNumber: '',
  weight: 0,
  pieces: 1,
  amount: 0,
})

const processRules = {
  trackingNumber: [{ required: true, message: '请输入快递单号', trigger: 'blur' }],
  weight: [{ required: true, message: '请输入重量', trigger: 'blur' }],
  pieces: [{ required: true, message: '请输入件数', trigger: 'blur' }],
  amount: [{ required: true, message: '请输入金额', trigger: 'blur' }],
}

function formatDate(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

async function loadTodos() {
  loading.value = true
  try {
    const res = await getPendingFlows()
    if (res.code === 200) {
      todoList.value = (res.data.list || []).filter(f => f.type === 'express')
    }
  } finally {
    loading.value = false
  }
}

function openDialog(flow: FlowItem) {
  currentFlow.value = flow
  processForm.trackingNumber = ''
  processForm.weight = 0
  processForm.pieces = 1
  processForm.amount = 0
  Object.keys(uploadedFiles).forEach(k => uploadedFiles[k] = '')
  dialogVisible.value = true
}

function triggerFileInput(key: string) {
  currentFileKey.value = key
  fileInputRef.value?.click()
}

function handleFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    uploadedFiles[currentFileKey.value] = input.files[0].name
  }
  input.value = ''
}

async function handleProcess() {
  if (!processFormRef.value || !currentFlow.value) return
  await processFormRef.value.validate()

  const requiredFiles = ['approvalEmail', 'costDetail', 'sapTemplate', 'invoice']
  const missing = requiredFiles.filter(k => !uploadedFiles[k])
  if (missing.length > 0) {
    const labels = missing.map(k => FILE_ITEMS.find(f => f.key === k)?.label)
    ElMessage.error(`请上传：${labels.join('、')}`)
    return
  }

  processing.value = true
  try {
    const user = authStore.user
    if (!user) {
      ElMessage.error('用户信息异常')
      return
    }
    const res = await approveFlow(currentFlow.value.id, {
      approver: user.name,
      comment: JSON.stringify({
        trackingNumber: processForm.trackingNumber,
        weight: processForm.weight,
        pieces: processForm.pieces,
        amount: processForm.amount,
        files: { ...uploadedFiles },
      }),
      nextStep: 'completed',
    })
    if (res.code === 200) {
      ElMessage.success('发运操作完成：快递单号与凭证已归档')
      dialogVisible.value = false
      loadTodos()
    } else {
      ElMessage.error(res.message || '处理失败')
    }
  } catch {
    ElMessage.error('网络异常，请重试')
  } finally {
    processing.value = false
  }
}

onMounted(() => {
  loadTodos()
})

defineExpose({ refresh: loadTodos })
</script>

<style scoped>
.express-process {
  min-height: 200px;
}

.loading-block {
  text-align: center;
  padding: 60px;
}

.loading-text {
  margin-top: 12px;
  color: var(--el-text-color-secondary);
}

.full-width {
  width: 100%;
}

.desc-block {
  margin-bottom: 20px;
}

.hidden-input {
  display: none;
}

.todo-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.todo-card {
  cursor: default;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 16px;
}

.todo-icon {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  background: var(--el-color-warning-light-9);
  color: var(--el-color-warning);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.todo-content {
  flex: 1;
  min-width: 0;
}

.todo-title {
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.todo-meta {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.process-dialog .file-upload-section {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.file-upload-title {
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--el-text-color-primary);
}

.file-upload-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.file-upload-item {
  border: 2px dashed var(--el-border-color);
  border-radius: 8px;
  padding: 16px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.file-upload-item:hover {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.file-upload-item.has-file {
  border-color: var(--el-color-success);
  background: var(--el-color-success-light-9);
}

.file-upload-item .el-icon {
  color: var(--el-text-color-secondary);
  margin-bottom: 4px;
}

.file-upload-item.has-file .el-icon {
  color: var(--el-color-success);
}

.file-upload-item-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-top: 4px;
}

.file-upload-item-hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
