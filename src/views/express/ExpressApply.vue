<template>
  <div class="express-apply">
    <!-- 步骤指示器 -->
    <div class="steps-wrapper">
      <el-steps :active="0" finish-status="success" align-center>
        <el-step title="填写申请" description="提交发运申请信息" />
        <el-step title="仓管员处理" description="仓管员安排快递" />
        <el-step title="发运完成" description="快递已发出" />
      </el-steps>
    </div>

    <!-- 表单卡片 -->
    <el-card shadow="never" class="form-card">
      <template #header>
        <div class="card-header">
          <el-icon :size="18"><Document /></el-icon>
          <span>发运申请信息</span>
        </div>
      </template>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="120px"
        label-position="top"
      >
        <el-row :gutter="20">
          <!-- 外发日期（只读） -->
          <el-col :span="12">
            <el-form-item label="外发日期">
              <el-input :model-value="today" readonly>
                <template #prefix><el-icon><Calendar /></el-icon></template>
              </el-input>
            </el-form-item>
          </el-col>
          <!-- PBU（只读） -->
          <el-col :span="12">
            <el-form-item label="PBU">
              <el-input :model-value="pbu" readonly>
                <template #prefix><el-icon><User /></el-icon></template>
              </el-input>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="物料描述" prop="materialDesc">
              <el-input v-model="form.materialDesc" placeholder="请输入外发物料的详细描述" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="发运原因" prop="shipReason">
              <el-input v-model="form.shipReason" placeholder="请输入发运原因" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="发运包装" prop="shipPackage">
              <el-select v-model="form.shipPackage" placeholder="请选择包装类型" class="full-width">
                <el-option v-for="p in PACKAGE_OPTIONS" :key="p" :label="p" :value="p" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="收件人" prop="recipient">
              <el-input v-model="form.recipient" placeholder="请输入收件人姓名" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="收件人电话" prop="recipientPhone">
              <el-input v-model="form.recipientPhone" placeholder="请输入11位手机号" maxlength="11" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="收货地址" prop="address">
              <el-input v-model="form.address" placeholder="请输入完整收货地址" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="运费项目号成本中心" prop="costCenter">
              <el-input v-model="form.costCenter" placeholder="请输入成本中心代码" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="备注">
              <el-input v-model="form.remark" placeholder="其它特殊要求填写 (选填)" />
            </el-form-item>
          </el-col>
        </el-row>

        <div class="form-actions">
          <el-button type="primary" :loading="submitting" @click="handleSubmit">
            <el-icon><Promotion /></el-icon> 提交申请
          </el-button>
          <el-button @click="resetForm">
            <el-icon><RefreshLeft /></el-icon> 重置
          </el-button>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, type FormInstance } from 'element-plus'
import { Document, Calendar, User, Promotion, RefreshLeft } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { createFlow } from '@/api/flows.api'

const PACKAGE_OPTIONS = ['纸箱', '木箱', '托盘', '文件袋']

const authStore = useAuthStore()

const formRef = ref<FormInstance>()
const submitting = ref(false)

const today = computed(() => new Date().toISOString().slice(0, 10))
const pbu = computed(() => authStore.user?.department || 'AS')

const form = reactive({
  materialDesc: '',
  shipReason: '',
  shipPackage: '',
  recipient: '',
  recipientPhone: '',
  address: '',
  costCenter: '',
  remark: '',
})

const phoneValidator = (_rule: unknown, value: string, callback: (error?: Error) => void) => {
  if (value && !/^1[3-9]\d{9}$/.test(value)) {
    callback(new Error('请输入正确的11位手机号'))
  } else {
    callback()
  }
}

const rules = {
  materialDesc: [{ required: true, message: '请输入物料描述', trigger: 'blur' }],
  shipReason: [{ required: true, message: '请输入发运原因', trigger: 'blur' }],
  shipPackage: [{ required: true, message: '请选择发运包装', trigger: 'change' }],
  recipient: [{ required: true, message: '请输入收件人', trigger: 'blur' }],
  recipientPhone: [
    { required: true, message: '请输入收件人电话', trigger: 'blur' },
    { validator: phoneValidator, trigger: 'blur' },
  ],
  address: [{ required: true, message: '请输入收货地址', trigger: 'blur' }],
  costCenter: [{ required: true, message: '请输入运费项目号成本中心', trigger: 'blur' }],
}

async function handleSubmit() {
  if (!formRef.value) return
  await formRef.value.validate()

  submitting.value = true
  try {
    const user = authStore.user
    if (!user) {
      ElMessage.error('用户信息异常，请重新登录')
      return
    }
    const res = await createFlow({
      type: 'express',
      creator: user.name,
      creatorId: user.id,
      status: 'pending',
      currentStep: 'keeper_processing',
      approver: '',
      data: {
        shipDate: today.value,
        pbu: pbu.value,
        materialDesc: form.materialDesc,
        shipReason: form.shipReason,
        shipPackage: form.shipPackage,
        recipient: form.recipient,
        recipientPhone: form.recipientPhone,
        address: form.address,
        costCenter: form.costCenter,
        remark: form.remark,
      },
    })
    if (res.code === 200) {
      ElMessage.success('快递发运申请已成功提交，等待仓管员处理')
      resetForm()
    } else {
      ElMessage.error(res.message || '提交失败')
    }
  } catch {
    ElMessage.error('网络异常，请重试')
  } finally {
    submitting.value = false
  }
}

function resetForm() {
  form.materialDesc = ''
  form.shipReason = ''
  form.shipPackage = ''
  form.recipient = ''
  form.recipientPhone = ''
  form.address = ''
  form.costCenter = ''
  form.remark = ''
  formRef.value?.clearValidate()
}

onMounted(() => {
  // 表单初始值已由 computed 自动填充（today / pbu）
})
</script>

<style scoped>
.express-apply {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.steps-wrapper {
  padding: 24px 16px;
  background: var(--el-fill-color-lighter);
  border-radius: 8px;
}

.form-card .card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.form-actions {
  display: flex;
  gap: 12px;
  padding-top: 8px;
  border-top: 1px solid var(--el-border-color-lighter);
  margin-top: 8px;
}

.full-width {
  width: 100%;
}
</style>
