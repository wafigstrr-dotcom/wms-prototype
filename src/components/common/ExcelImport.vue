<template>
  <div>
    <el-upload
      ref="uploadRef"
      :auto-upload="false"
      :limit="1"
      accept=".xlsx,.xls,.csv"
      :on-change="handleFileChange"
      :show-file-list="false"
    >
      <el-button :loading="loading" :disabled="loading">
        <el-icon v-if="!loading"><Upload /></el-icon>
        {{ loading ? '数据读取中...' : '批量导入' }}
      </el-button>
    </el-upload>

    <!-- 导入结果 -->
    <el-dialog v-model="showResult" title="导入结果" width="500px" destroy-on-close>
      <div v-if="result">
        <el-alert
          :type="result.failed > 0 ? 'warning' : 'success'"
          :title="`导入完成：成功 ${result.success} 条，失败 ${result.failed} 条`"
          show-icon
          :closable="false"
          class="import-alert"
        />
        <div v-if="result.errors.length > 0" class="error-scroll">
          <p class="error-title">失败明细：</p>
          <ul class="error-list">
            <li v-for="(err, idx) in result.errors" :key="idx">{{ err }}</li>
          </ul>
        </div>
      </div>
      <template #footer>
        <el-button type="primary" @click="showResult = false">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import * as XLSX from 'xlsx'
import { ElMessage } from 'element-plus'
import type { UploadFile } from 'element-plus'

const props = defineProps<{
  importFn: (rows: Record<string, unknown>[]) => Promise<{ code: number; message: string; data: { success: number; failed: number; errors: string[] } }>
}>()

const emit = defineEmits<{
  (e: 'success'): void
}>()

const uploadRef = ref()
const loading = ref(false)
const showResult = ref(false)
const result = ref<{ success: number; failed: number; errors: string[] } | null>(null)

async function handleFileChange(uploadFile: UploadFile) {
  const file = uploadFile.raw
  if (!file) return

  loading.value = true
  try {
    const data = await file.arrayBuffer()
    const workbook = XLSX.read(data, { type: 'array' })
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(firstSheet)

    if (rows.length === 0) {
      ElMessage.warning('Excel 文件中无有效数据')
      loading.value = false
      return
    }

    const res = await props.importFn(rows)
    result.value = res.data
    showResult.value = true

    if (res.data.success > 0) {
      emit('success')
    }
  } catch (e) {
    ElMessage.error('文件解析失败，请确认格式正确')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.import-alert {
  margin-bottom: 16px;
}

.error-scroll {
  max-height: 300px;
  overflow-y: auto;
}

.error-title {
  font-weight: 600;
  margin-bottom: 8px;
}

.error-list {
  padding-left: 20px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
</style>
