<template>
  <div class="engineer-inbound">
    <!-- 提示信息 -->
    <el-alert
      title="工程师入库为简化流程，仅需填写基础信息，提交后将生成电子流转至仓管员补充仓库和货位信息。"
      type="info"
      show-icon
      :closable="false"
      class="engineer-hint"
    />

    <!-- 工具栏 -->
    <div class="form-toolbar">
      <div class="toolbar-title">单条录入</div>
      <div class="toolbar-right">
        <el-button @click="downloadTemplate('工程师入库模板', engineerTemplateHeaders)">
          <el-icon><Download /></el-icon> 导出模板
        </el-button>
        <ExcelImport :import-fn="handleImport" />
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

      <el-form-item label="PO号" prop="poNumber">
        <el-input v-model="form.poNumber" placeholder="可输入或选择（如：样品）" list="po-list" />
        <datalist id="po-list">
          <option value="样品" />
        </datalist>
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

      <el-form-item label="单价" prop="unitPrice">
        <el-input v-model="form.unitPrice" placeholder="0.00" type="number" step="0.01">
          <template #prefix>¥</template>
        </el-input>
      </el-form-item>
    </el-form>

    <div class="hidden-fields-info">
      <el-icon><MagicStick /></el-icon>
      以下字段将由系统自动填充：申请人、所属人、所属部门（根据登录账号自动获取）
    </div>

    <div class="form-actions">
      <el-button type="primary" :loading="submitting" @click="handleSubmit">
        <el-icon v-if="!submitting"><Promotion /></el-icon>
        {{ submitting ? '提交中...' : '提交申请' }}
      </el-button>
      <el-button @click="resetForm">
        <el-icon><RefreshRight /></el-icon>
        重置信息
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage, type FormInstance } from 'element-plus'
import * as XLSX from 'xlsx'
import { useAuthStore } from '@/stores/auth'
import { createFlow, importInventory } from '@/api/inbound.api'
import ExcelImport from '@/components/common/ExcelImport.vue'

const authStore = useAuthStore()

const PBU_OPTIONS = ['AS', 'CS', 'IR', 'BMS', 'SS']
const UNIT_OPTIONS = ['件', '套', '瓶', '个', '卷', '根', '条', '米', 'KG', '桶', '箱', '把', '张', '盒']
const engineerTemplateHeaders = ['物料名称', '项目编号', 'PBU', '免3C', 'PO号', '供应商编号', '数量', '单位', '单价']

const formRef = ref<FormInstance>()
const submitting = ref(false)

const form = reactive({
  materialName: '',
  projectCode: '',
  pbu: '',
  exempt3C: '',
  poNumber: '',
  supplierCode: '',
  quantity: 1,
  unit: '',
  unitPrice: 0,
})

const rules = {
  materialName: [{ required: true, message: '请输入物料名称', trigger: 'blur' }],
  projectCode: [{ required: true, message: '请输入项目编号', trigger: 'blur' }],
  pbu: [{ required: true, message: '请选择PBU', trigger: 'change' }],
  exempt3C: [{ required: true, message: '请选择免3C', trigger: 'change' }],
  quantity: [{ required: true, message: '请输入数量', trigger: 'blur' }],
  unit: [{ required: true, message: '请选择单位', trigger: 'change' }],
  unitPrice: [{ required: true, message: '请输入单价', trigger: 'blur' }],
}

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
    const flowData = {
      ...form,
      applicant: user.name,
      owner: user.name,
      department: user.department,
    }

    const res = await createFlow({
      type: 'inbound_engineer',
      status: 'pending',
      currentStep: 'keeper_review',
      creator: user.name,
      creatorId: user.id,
      data: flowData,
      approver: '',
    })

    if (res.code === 200) {
      ElMessage.success(`入库申请 ${res.data.flowNo} 已提交，等待仓管员处理`)
      resetForm()
    } else {
      ElMessage.error(res.message || '提交失败')
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
    materialName: '', projectCode: '', pbu: '', exempt3C: '',
    poNumber: '', supplierCode: '', quantity: 1, unit: '', unitPrice: 0,
  })
}

async function handleImport(rows: Record<string, unknown>[]) {
  return importInventory(rows)
}

function downloadTemplate(name: string, headers: string[]) {
  const ws = XLSX.utils.aoa_to_sheet([headers])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '模板')
  XLSX.writeFile(wb, `${name}.xlsx`)
  ElMessage.success(`${name} 下载成功`)
}
</script>

<style scoped>
.full-width {
  width: 100%;
}
.engineer-inbound {
  padding: 24px 0;
}

.engineer-hint {
  margin-bottom: 20px;
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

.hidden-fields-info {
  background: var(--jc-bg-gray);
  border-radius: var(--jc-radius-control);
  padding: 12px 16px;
  margin-top: 16px;
  font-size: 12px;
  color: var(--jc-text-light);
  display: flex;
  align-items: center;
  gap: 8px;
}

.hidden-fields-info .el-icon {
  color: var(--jc-accent-teal);
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--jc-border-line-light);
}
</style>
