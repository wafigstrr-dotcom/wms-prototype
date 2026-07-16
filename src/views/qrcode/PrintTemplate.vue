<template>
  <el-row :gutter="24">
    <!-- 左侧模板设置 -->
    <el-col :xs="24" :lg="12">
      <el-card shadow="never">
        <template #header>
          <div class="card-header">
            <el-icon><Setting /></el-icon>
            <span>模板设置</span>
          </div>
        </template>

        <el-form label-width="100px" size="default">
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="标签宽度 (mm)">
                <el-input-number v-model="form.width" :min="20" :max="150" controls-position="right" @change="applyTemplate" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="标签高度 (mm)">
                <el-input-number v-model="form.height" :min="30" :max="200" controls-position="right" @change="applyTemplate" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="二维码尺寸 (px)">
                <el-input-number v-model="form.qrSize" :min="60" :max="300" controls-position="right" @change="applyTemplate" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="字体大小 (px)">
                <el-input-number v-model="form.fontSize" :min="8" :max="24" controls-position="right" @change="applyTemplate" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="显示字段">
            <div class="field-toggle-list">
              <div class="field-toggle-item">
                <span>物料名称</span>
                <el-switch v-model="form.showName" @change="applyTemplate" />
              </div>
              <div class="field-toggle-item">
                <span>物料编号</span>
                <el-switch v-model="form.showCode" @change="applyTemplate" />
              </div>
              <div class="field-toggle-item">
                <span>所属人</span>
                <el-switch v-model="form.showOwner" @change="applyTemplate" />
              </div>
              <div class="field-toggle-item">
                <span>所属部门</span>
                <el-switch v-model="form.showDept" @change="applyTemplate" />
              </div>
              <div class="field-toggle-item">
                <span>仓库</span>
                <el-switch v-model="form.showWarehouse" @change="applyTemplate" />
              </div>
              <div class="field-toggle-item">
                <span>货位</span>
                <el-switch v-model="form.showLocation" @change="applyTemplate" />
              </div>
            </div>
          </el-form-item>
        </el-form>

        <div class="template-actions">
          <el-button type="primary" @click="applyTemplate">
            <el-icon><Check /></el-icon> 应用设置
          </el-button>
          <el-button @click="handleExport">
            <el-icon><Download /></el-icon> 导出模板
          </el-button>
          <el-upload
            :auto-upload="false"
            :show-file-list="false"
            accept=".json"
            :on-change="handleImport"
          >
            <el-button>
              <el-icon><Upload /></el-icon> 导入模板
            </el-button>
          </el-upload>
          <el-button type="info" plain @click="handleReset">
            <el-icon><RefreshLeft /></el-icon> 恢复默认
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
            <span>模板预览</span>
          </div>
        </template>
        <div class="preview-area">
          <QRLabel :item="demoItem" :template="form" :max-size="200" />
        </div>
      </el-card>
    </el-col>
  </el-row>
</template>

<script setup lang="ts">
import { reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Setting, Check, Download, Upload, RefreshLeft, View } from '@element-plus/icons-vue'
import type { UploadFile } from 'element-plus'
import QRLabel from './QRLabel.vue'
import { loadTemplate, saveTemplate, exportTemplate, parseImportedTemplate, DEFAULT_TEMPLATE, type PrintTemplate } from './templateConfig'

const emit = defineEmits<{ (e: 'update', tpl: PrintTemplate): void }>()

const form = reactive<PrintTemplate>({ ...DEFAULT_TEMPLATE })

const demoItem = {
  materialName: '预览-物料名称',
  materialCode: 'CODE-000',
  owner: '责任人',
  department: '技术部',
  warehouse: 'A区仓库',
  location: 'A-01-01',
}

function applyTemplate() {
  const tpl = { ...form }
  saveTemplate(tpl)
  emit('update', tpl)
}

function handleExport() {
  exportTemplate({ ...form })
  ElMessage.success('打印模板导出成功')
}

function handleImport(file: UploadFile) {
  if (!file.raw) return
  const reader = new FileReader()
  reader.onload = (e) => {
    const result = parseImportedTemplate(e.target?.result as string)
    if (result) {
      Object.assign(form, result)
      applyTemplate()
      ElMessage.success('打印模板导入成功')
    } else {
      ElMessage.error('模板文件格式错误，请检查 JSON 文件')
    }
  }
  reader.readAsText(file.raw)
}

function handleReset() {
  Object.assign(form, DEFAULT_TEMPLATE)
  applyTemplate()
  ElMessage.success('已恢复默认模板设置')
}

onMounted(() => {
  const saved = loadTemplate()
  Object.assign(form, saved)
  emit('update', { ...form })
})
</script>

<style scoped>
.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #303133;
}

.field-toggle-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.field-toggle-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0;
}

.template-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
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
  width: 100%;
  overflow: auto;
  padding: 10px;
}
</style>
