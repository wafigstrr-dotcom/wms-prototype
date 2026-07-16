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
        <el-table-column label="物料名称" min-width="150">
          <template #default="{ row }">{{ row.data.materialName }}</template>
        </el-table-column>
        <el-table-column label="申请人" width="120">
          <template #default="{ row }">{{ row.data.applicant }}</template>
        </el-table-column>
        <el-table-column label="部门" width="120">
          <template #default="{ row }">{{ row.data.department }}</template>
        </el-table-column>
        <el-table-column label="数量" width="100">
          <template #default="{ row }">{{ row.data.quantity }} {{ row.data.unit }}</template>
        </el-table-column>
        <el-table-column label="申请时间" width="160">
          <template #default="{ row }">{{ formatDate(row.createTime) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right" align="center">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="openProcessDialog(row)">
              处理
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!loading && pendingList.length === 0" description="暂无入库待办" />
    </el-card>

    <!-- 处理弹窗 -->
    <el-dialog v-model="dialogVisible" title="补充入库信息" width="700px" destroy-on-close>
      <div v-if="currentFlow" class="dialog-content">
        <!-- 只读信息区 -->
        <div class="section-title">
          <el-icon><Document /></el-icon> 基础信息 (工程师填写)
        </div>
        <el-descriptions :column="2" border size="small" class="readonly-desc">
          <el-descriptions-item label="物料名称">{{ currentFlow.data.materialName }}</el-descriptions-item>
          <el-descriptions-item label="数量">{{ currentFlow.data.quantity }} {{ currentFlow.data.unit }}</el-descriptions-item>
          <el-descriptions-item label="项目编号">{{ currentFlow.data.projectCode }}</el-descriptions-item>
          <el-descriptions-item label="PBU">{{ currentFlow.data.pbu }}</el-descriptions-item>
          <el-descriptions-item label="免3C">{{ currentFlow.data.exempt3C }}</el-descriptions-item>
          <el-descriptions-item label="PO号">{{ currentFlow.data.poNumber || '-' }}</el-descriptions-item>
          <el-descriptions-item label="单价">{{ currentFlow.data.unitPrice || '0' }} 元</el-descriptions-item>
          <el-descriptions-item label="供应商编号">{{ currentFlow.data.supplierCode || '-' }}</el-descriptions-item>
        </el-descriptions>

        <!-- 补充表单区 -->
        <div class="section-title" style="margin-top: 24px;">
          <el-icon><Edit /></el-icon> 仓管员补充 (必填)
        </div>
        <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="物料类别" prop="materialCategory">
                <el-select v-model="form.materialCategory" placeholder="请选择类别" class="full-width">
                  <el-option v-for="opt in CATEGORY_OPTIONS" :key="opt" :label="opt" :value="opt" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="物料编号" prop="materialCode" :class="{ 'dynamic-required': isCodeRequired }">
                <el-input v-model="form.materialCode" :placeholder="isCodeRequired ? '该类别必填编号' : '请输入编号'" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="仓库" prop="warehouse">
                <el-select v-model="form.warehouse" placeholder="请选择入库仓库" class="full-width">
                  <el-option v-for="wh in warehouseOptions" :key="wh.id" :label="wh.name" :value="wh.name" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="货位" prop="location">
                <el-select v-model="form.location" :disabled="!form.warehouse" :placeholder="form.warehouse ? '请选择货位' : '请先选择仓库'" class="full-width">
                  <el-option v-for="loc in locationOptions" :key="loc" :label="loc" :value="loc" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleApprove">
          确认入库
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { ElMessage, type FormInstance } from 'element-plus'
import { List, Document, Edit } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { getPendingFlows, approveFlow, type FlowItem } from '@/api/flows.api'
import { addInventory } from '@/api/inventory.api'
import { getWarehouses, getLocations } from '@/api/inbound.api'

const authStore = useAuthStore()

// 枚举常量
const CATEGORY_OPTIONS = ['室外机', '室内机', '压缩机', '控制箱', '工装', '化学品', '新物料', '拆机物料', '工具辅料']
const REQUIRED_CODE_CATEGORIES = ['室外机', '室内机', '压缩机', '控制箱']

// 列表状态
const loading = ref(false)
const pendingList = ref<FlowItem[]>([])

// 弹窗与表单状态
const dialogVisible = ref(false)
const submitting = ref(false)
const currentFlow = ref<FlowItem | null>(null)
const formRef = ref<FormInstance>()

const warehouseOptions = ref<{ id: number; name: string }[]>([])
const locationOptions = ref<string[]>([])

const form = reactive({
  materialCategory: '',
  materialCode: '',
  warehouse: '',
  location: ''
})

const isCodeRequired = computed(() => REQUIRED_CODE_CATEGORIES.includes(form.materialCategory))

const rules = computed(() => ({
  materialCategory: [{ required: true, message: '请选择物料类别', trigger: 'change' }],
  materialCode: isCodeRequired.value ? [{ required: true, message: '该物料类别必须填写物料编号', trigger: 'blur' }] : [],
  warehouse: [{ required: true, message: '请选择仓库', trigger: 'change' }],
  location: [{ required: true, message: '请选择货位', trigger: 'change' }],
}))

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

// 监听仓库加载对应货位
watch(() => form.warehouse, async (val) => {
  form.location = ''
  locationOptions.value = []
  if (val) {
    try {
      const res = await getLocations({ warehouseName: val })
      locationOptions.value = res.data.list.map(l => l.locationCode)
    } catch {
      locationOptions.value = []
    }
  }
})

function openProcessDialog(row: any) {
  currentFlow.value = row
  form.materialCategory = ''
  form.materialCode = ''
  form.warehouse = ''
  form.location = ''
  dialogVisible.value = true
}

// 双重提交：1.入库存台账 2.完结流程
async function handleApprove() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  if (!currentFlow.value) return

  const user = authStore.user
  if (!user) {
    ElMessage.error('用户未登录')
    return
  }

  submitting.value = true
  try {
    // 1. 合并数据准备入库
    const combinedData = {
      ...currentFlow.value.data,
      materialCategory: form.materialCategory,
      materialCode: form.materialCode,
      warehouse: form.warehouse,
      location: form.location,
    }
    
    const inventoryRes = await addInventory(combinedData)
    if (inventoryRes.code !== 200) {
      ElMessage.error(inventoryRes.message || '写入库存失败')
      return
    }

    // 2. 审批流通过
    const commentObj = {
      materialCategory: form.materialCategory,
      materialCode: form.materialCode,
      warehouse: form.warehouse,
      location: form.location,
      inboundNo: inventoryRes.data.inboundNo
    }

    const flowRes = await approveFlow(currentFlow.value.id, {
      approver: user.name,
      comment: JSON.stringify(commentObj),
      nextStep: 'completed'
    })

    if (flowRes.code === 200) {
      ElMessage.success(`入库成功，单号: ${inventoryRes.data.inboundNo}`)
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
.full-width {
  width: 100%;
}
.inbound-process {
  padding: 12px 0;
}
.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: var(--jc-text-dark);
}
.todo-count {
  margin-left: 8px;
}
.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--jc-text-dark);
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.section-title .el-icon {
  color: var(--jc-accent-teal);
}
.readonly-desc {
  margin-bottom: 24px;
}
.dynamic-required :deep(.el-form-item__label::after) {
  content: ' *';
  color: var(--jc-danger-red);
}
</style>
