<template>
  <el-row :gutter="24">
    <!-- 左侧表单 -->
    <el-col :xs="24" :lg="12">
      <el-card shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon><Edit /></el-icon>
            <span>物料信息</span>
          </div>
        </template>
        <el-form :model="form" label-width="80px" size="default">
          <el-form-item label="物料名称" required>
            <el-input v-model="form.materialName" placeholder="请输入物料名称" />
          </el-form-item>
          <el-form-item label="物料编号" required>
            <el-input v-model="form.materialCode" placeholder="请输入物料编号" />
          </el-form-item>
          <el-form-item label="所属人" required>
            <el-input v-model="form.owner" placeholder="请输入所属人" />
          </el-form-item>
          <el-form-item label="所属部门">
            <el-input v-model="form.department" placeholder="请输入所属部门（选填）" />
          </el-form-item>
          <el-form-item label="仓库">
            <el-input v-model="form.warehouse" placeholder="请输入仓库（选填）" />
          </el-form-item>
          <el-form-item label="货位">
            <el-input v-model="form.location" placeholder="请输入货位（选填）" />
          </el-form-item>
        </el-form>
        <div class="form-actions">
          <el-button type="primary" @click="generatePreview">
            <el-icon><Refresh /></el-icon> 生成预览
          </el-button>
          <el-button type="success" @click="handlePrint">
            <el-icon><Printer /></el-icon> 打印标签
          </el-button>
          <el-button @click="resetForm">
            <el-icon><RefreshLeft /></el-icon> 重置
          </el-button>
        </div>
      </el-card>
    </el-col>

    <!-- 右侧预览 -->
    <el-col :xs="24" :lg="12">
      <el-card shadow="never" class="preview-card">
        <template #header>
          <div class="card-header">
            <el-icon><View /></el-icon>
            <span>标签预览</span>
          </div>
        </template>
        <div class="preview-area">
          <QRLabel
            v-if="showPreview"
            :item="previewItem"
            :template="template"
            :max-size="180"
          />
          <div v-else class="empty-preview">
            <el-icon :size="48" color="#dcdfe6"><Promotion /></el-icon>
            <p>请填写物料信息后点击"生成预览"</p>
          </div>
        </div>
      </el-card>
    </el-col>
  </el-row>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Edit, Refresh, Printer, RefreshLeft, View, Promotion } from '@element-plus/icons-vue'
import QRLabel from './QRLabel.vue'
import { printLabels } from './usePrintLabels'
import type { QRItem, PrintTemplate } from './templateConfig'

const props = defineProps<{ template: PrintTemplate }>()

const form = reactive<QRItem>({
  materialName: '',
  materialCode: '',
  owner: '',
  department: '',
  warehouse: '',
  location: '',
})

const showPreview = ref(false)
const previewItem = ref<QRItem>({ ...form })

// debounce watch - 自动刷新预览
let timer: ReturnType<typeof setTimeout> | null = null
watch(
  () => ({ ...form }),
  (val) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      if (val.materialName || val.materialCode || val.owner) {
        previewItem.value = { ...val }
        showPreview.value = true
      }
    }, 300)
  },
  { deep: true },
)

function generatePreview() {
  if (!form.materialName && !form.materialCode && !form.owner) {
    ElMessage.warning('请至少填写物料名称、物料编号或所属人')
    return
  }
  previewItem.value = { ...form }
  showPreview.value = true
}

function handlePrint() {
  if (!form.materialName || !form.materialCode || !form.owner) {
    ElMessage.error('请填写完整的物料信息（物料名称、物料编号、所属人）')
    return
  }
  printLabels([{ ...form }], props.template)
}

function resetForm() {
  form.materialName = ''
  form.materialCode = ''
  form.owner = ''
  form.department = ''
  form.warehouse = ''
  form.location = ''
  showPreview.value = false
}
</script>

<style scoped>
.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #303133;
}

.form-actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}

.preview-card {
  min-height: 420px;
}

.preview-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 320px;
}

.empty-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #c0c4cc;
}

.empty-preview p {
  font-size: 14px;
}
</style>
