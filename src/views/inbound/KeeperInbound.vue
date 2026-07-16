<template>
  <div class="keeper-inbound">
    <!-- 工具栏 -->
    <div class="form-toolbar">
      <div class="toolbar-title">单条录入</div>
      <div class="toolbar-right">
        <el-button @click="downloadTemplate('仓管员入库模板', keeperTemplateHeaders)">
          <el-icon><Download /></el-icon> 导出模板
        </el-button>
        <ExcelImport :import-fn="handleImport" @success="loadRecentRecords" />
      </div>
    </div>

    <!-- 表单 -->
    <div class="form-section-title">
      <el-icon><Edit /></el-icon>
      入库信息录入
    </div>

    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      class="form-grid"
    >
      <el-form-item label="物料名称" prop="materialName">
        <el-input v-model="form.materialName" placeholder="请输入物料名称" />
      </el-form-item>

      <el-form-item label="物料编号" prop="materialCode" :class="{ 'dynamic-required': isCodeRequired }">
        <el-input v-model="form.materialCode" :placeholder="isCodeRequired ? '请输入物料编号（必填）' : '请输入物料编号'" />
      </el-form-item>

      <el-form-item label="项目编号" prop="projectCode">
        <el-input v-model="form.projectCode" placeholder="请输入项目编号" />
      </el-form-item>

      <el-form-item label="PBU" prop="pbu">
        <el-select v-model="form.pbu" placeholder="请选择" class="full-width">
          <el-option v-for="opt in PBU_OPTIONS" :key="opt" :label="opt" :value="opt" />
        </el-select>
      </el-form-item>

      <el-form-item label="免3C" prop="exempt3C">
        <el-select v-model="form.exempt3C" placeholder="请选择" class="full-width">
          <el-option label="是" value="是" />
          <el-option label="否" value="否" />
        </el-select>
      </el-form-item>

      <el-form-item label="物料类别" prop="materialCategory">
        <el-select v-model="form.materialCategory" placeholder="请选择" class="full-width">
          <el-option v-for="opt in CATEGORY_OPTIONS" :key="opt" :label="opt" :value="opt" />
        </el-select>
      </el-form-item>

      <el-form-item label="所属人" prop="owner">
        <el-input v-model="form.owner" placeholder="请输入所属人" />
      </el-form-item>

      <el-form-item label="所属部门" prop="department">
        <el-input v-model="form.department" placeholder="请输入所属部门" />
      </el-form-item>

      <el-form-item label="PO号" prop="poNumber">
        <el-input v-model="form.poNumber" placeholder="请输入PO号" />
      </el-form-item>

      <el-form-item label="供应商编号" prop="supplierCode">
        <el-input v-model="form.supplierCode" placeholder="请输入供应商编号" />
      </el-form-item>

      <el-form-item label="数量" prop="quantity">
        <el-input-number v-model="form.quantity" :min="1" :step="1" placeholder="请输入数量" class="full-width" />
      </el-form-item>

      <el-form-item label="单位" prop="unit">
        <el-select v-model="form.unit" placeholder="请选择" class="full-width">
          <el-option v-for="opt in UNIT_OPTIONS" :key="opt" :label="opt" :value="opt" />
        </el-select>
      </el-form-item>

      <el-form-item label="仓库" prop="warehouse">
        <el-select v-model="form.warehouse" placeholder="请选择" class="full-width">
          <el-option v-for="wh in warehouseOptions" :key="wh.id" :label="wh.name" :value="wh.name" />
        </el-select>
      </el-form-item>

      <el-form-item label="货位" prop="location">
        <el-select v-model="form.location" :disabled="!form.warehouse" :placeholder="form.warehouse ? '请选择货位' : '请先选择仓库'" class="full-width">
          <el-option v-for="loc in locationOptions" :key="loc" :label="loc" :value="loc" />
        </el-select>
      </el-form-item>

      <el-form-item label="单价" prop="unitPrice">
        <el-input v-model="form.unitPrice" placeholder="0.00" type="number" step="0.01">
          <template #prefix>¥</template>
        </el-input>
      </el-form-item>
    </el-form>

    <div class="form-actions">
      <el-button type="primary" :loading="submitting" @click="handleSubmit">
        <el-icon v-if="!submitting"><Check /></el-icon>
        {{ submitting ? '提交中...' : '提交入库' }}
      </el-button>
      <el-button @click="resetForm">
        <el-icon><RefreshRight /></el-icon>
        重置信息
      </el-button>
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
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { ElMessage, type FormInstance } from 'element-plus'
import * as XLSX from 'xlsx'
import { useAuthStore } from '@/stores/auth'
import { getInventoryList, addInventory } from '@/api/inventory.api'
import { getWarehouses, getLocations, importInventory } from '@/api/inbound.api'
import ExcelImport from '@/components/common/ExcelImport.vue'
import type { InventoryItem } from '@/types'

const emit = defineEmits<{ (e: 'success'): void }>()

// 枚举选项
const PBU_OPTIONS = ['AS', 'CS', 'IR', 'BMS', 'SS']
const CATEGORY_OPTIONS = ['室外机', '室内机', '压缩机', '控制箱', '工装', '化学品', '新物料', '拆机物料', '工具辅料']
const UNIT_OPTIONS = ['件', '套', '瓶', '个', '卷', '根', '条', '米', 'KG', '桶', '箱', '把', '张', '盒']
const REQUIRED_CODE_CATEGORIES = ['室外机', '室内机', '压缩机', '控制箱']

const keeperTemplateHeaders = ['物料名称', '物料编号', '项目编号', 'PBU', '免3C', '物料类别', '所属人', '所属部门', 'PO号', '供应商编号', '数量', '单位', '仓库', '货位', '单价']

const authStore = useAuthStore()

const formRef = ref<FormInstance>()
const submitting = ref(false)
const warehouseOptions = ref<{ id: number; name: string }[]>([])
const locationOptions = ref<string[]>([])
const recentRecords = ref<InventoryItem[]>([])

const form = reactive({
  materialName: '',
  materialCode: '',
  projectCode: '',
  pbu: '',
  exempt3C: '',
  materialCategory: '',
  owner: '',
  department: '',
  poNumber: '',
  supplierCode: '',
  quantity: 1,
  unit: '',
  warehouse: '',
  location: '',
  unitPrice: 0,
})

// 物料编号动态必填
const isCodeRequired = computed(() => REQUIRED_CODE_CATEGORIES.includes(form.materialCategory))

const rules = computed(() => ({
  materialName: [{ required: true, message: '请输入物料名称', trigger: 'blur' }],
  materialCode: isCodeRequired.value ? [{ required: true, message: '该物料类别必须填写物料编号', trigger: 'blur' }] : [],
  projectCode: [{ required: true, message: '请输入项目编号', trigger: 'blur' }],
  pbu: [{ required: true, message: '请选择PBU', trigger: 'change' }],
  exempt3C: [{ required: true, message: '请选择免3C', trigger: 'change' }],
  materialCategory: [{ required: true, message: '请选择物料类别', trigger: 'change' }],
  owner: [{ required: true, message: '请输入所属人', trigger: 'blur' }],
  department: [{ required: true, message: '请输入所属部门', trigger: 'blur' }],
  poNumber: [{ required: true, message: '请输入PO号', trigger: 'blur' }],
  quantity: [{ required: true, message: '请输入数量', trigger: 'blur' }],
  unit: [{ required: true, message: '请选择单位', trigger: 'change' }],
  warehouse: [{ required: true, message: '请选择仓库', trigger: 'change' }],
  location: [{ required: true, message: '请选择货位', trigger: 'change' }],
  unitPrice: [{ required: true, message: '请输入单价', trigger: 'blur' }],
}))

// 仓库-货位联动
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

// 提交
async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  const user = authStore.user
  if (!user) {
    ElMessage.error('请先登录')
    return
  }

  submitting.value = true
  try {
    await getInventoryList({}) // 先获取现有列表，确保索引更新
    // 调用封装的 API，并追加隐式字段
    const data = await addInventory({
      ...form,
      applicant: user.name,
    })
    if (data.code === 200) {
      ElMessage.success(`入库单 ${data.data.inboundNo} 创建成功`)
      resetForm()
      loadRecentRecords()
      emit('success')
    } else {
      ElMessage.error(data.message || '提交失败')
    }
  } catch {
    ElMessage.error('提交失败，请重试')
  } finally {
    submitting.value = false
  }
}

function resetForm() {
  formRef.value?.resetFields()
  Object.assign(form, {
    materialName: '', materialCode: '', projectCode: '', pbu: '', exempt3C: '',
    materialCategory: '', owner: '', department: '', poNumber: '', supplierCode: '',
    quantity: 1, unit: '', warehouse: '', location: '', unitPrice: 0,
  })
}

// 加载最近记录
async function loadRecentRecords() {
  try {
    const res = await getInventoryList({})
    recentRecords.value = res.data.list.slice(-20).reverse()
  } catch {
    recentRecords.value = []
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

// 批量导入
async function handleImport(rows: Record<string, unknown>[]) {
  return importInventory(rows)
}

// 导出模板
function downloadTemplate(name: string, headers: string[]) {
  const ws = XLSX.utils.aoa_to_sheet([headers])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '模板')
  XLSX.writeFile(wb, `${name}.xlsx`)
  ElMessage.success(`${name} 下载成功`)
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
.full-width {
  width: 100%;
}
.keeper-inbound {
  padding: 24px 0;
}

.form-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--jc-border-line-light);
}

.toolbar-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--jc-text-dark);
}

.toolbar-right {
  display: flex;
  gap: 8px;
}

.form-section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--jc-text-dark);
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--jc-border-line-light);
  display: flex;
  align-items: center;
  gap: 8px;
}

.form-section-title .el-icon {
  color: var(--jc-accent-teal);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0 16px;
}

@media (max-width: 1200px) {
  .form-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}

.dynamic-required :deep(.el-form-item__label::after) {
  content: ' *';
  color: var(--jc-danger-red);
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--jc-border-line-light);
}

.recent-records {
  margin-top: 24px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--jc-text-dark);
}
</style>
