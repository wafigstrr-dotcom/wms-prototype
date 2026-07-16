<template>
  <div>
    <!-- 库存台账 -->
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <div class="card-title-row">
            <el-icon><Grid /></el-icon>
            <span>库存台账</span>
          </div>
          <span class="selected-count">已选择 <strong>{{ selectedRows.length }}</strong> 条</span>
        </div>
      </template>

      <!-- 工具栏 -->
      <div class="batch-toolbar">
        <div class="toolbar-left">
          <el-input v-model="keyword" placeholder="搜索物料名称/编号/所属人" clearable class="search-input" @input="onSearch" />
        </div>
        <div class="toolbar-right">
          <el-button @click="selectAll">全选</el-button>
          <el-button @click="clearSelection">清空</el-button>
          <el-button type="primary" :disabled="selectedRows.length === 0" @click="generatePreview">
            <el-icon><Refresh /></el-icon> 生成预览
          </el-button>
          <el-button type="success" :disabled="previewItems.length === 0 && selectedRows.length === 0" @click="handlePrint">
            <el-icon><Printer /></el-icon> 打印选中
          </el-button>
        </div>
      </div>

      <!-- 表格 -->
      <el-table
        ref="tableRef"
        :data="filteredData"
        v-loading="loading"
        stripe
        border
        size="small"
        max-height="380"
        @selection-change="onSelectionChange"
        row-key="id"
      >
        <el-table-column type="selection" width="45" reserve-selection />
        <el-table-column prop="materialName" label="物料名称" min-width="120" show-overflow-tooltip />
        <el-table-column prop="materialCode" label="物料编号" min-width="100" show-overflow-tooltip />
        <el-table-column prop="owner" label="所属人" min-width="80" />
        <el-table-column prop="department" label="所属部门" min-width="80" />
        <el-table-column prop="materialCategory" label="物料类别" min-width="80">
          <template #default="{ row }">
            <el-tag size="small" type="info">{{ row.materialCategory }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="warehouse" label="仓库" min-width="80" />
        <el-table-column prop="location" label="货位" min-width="80" />
        <el-table-column prop="remainingStock" label="剩余库存" min-width="70" align="right" />
      </el-table>
    </el-card>

    <!-- 批量预览 -->
    <el-card shadow="never" class="preview-section">
      <template #header>
        <div class="card-header">
          <div class="card-title-row">
            <el-icon><PictureFilled /></el-icon>
            <span>批量预览</span>
          </div>
          <el-button v-if="previewItems.length > 0" type="danger" size="small" @click="clearPreview">
            <el-icon><Delete /></el-icon> 清空预览
          </el-button>
        </div>
      </template>

      <div v-if="previewItems.length > 0" class="preview-grid">
        <QRLabel
          v-for="(item, idx) in previewItems"
          :key="idx"
          :item="item"
          :template="template"
          :removable="true"
          :max-size="100"
          @remove="removePreview(idx)"
        />
      </div>
      <div v-else class="empty-preview">
        <el-icon :size="40" color="#dcdfe6"><PictureFilled /></el-icon>
        <p>从上方库存台账中选择物料，点击"生成预览"查看批量标签</p>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Grid, Refresh, Printer, Delete, PictureFilled } from '@element-plus/icons-vue'
import QRLabel from './QRLabel.vue'
import { printLabels } from './usePrintLabels'
import { getInventoryList } from '@/api/inventory.api'
import type { InventoryItem } from '@/types'
import type { QRItem, PrintTemplate } from './templateConfig'

const props = defineProps<{ template: PrintTemplate }>()

const loading = ref(false)
const allData = ref<InventoryItem[]>([])
const keyword = ref('')
const selectedRows = ref<InventoryItem[]>([])
const previewItems = ref<QRItem[]>([])
const tableRef = ref<{ toggleAllSelection: () => void; clearSelection: () => void }>()

const filteredData = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return allData.value
  return allData.value.filter(i =>
    i.materialName.toLowerCase().includes(kw) ||
    (i.materialCode || '').toLowerCase().includes(kw) ||
    i.owner.toLowerCase().includes(kw)
  )
})

async function loadData() {
  loading.value = true
  try {
    const res = await getInventoryList({})
    allData.value = (res.data.list || []).filter(i => i.remainingStock > 0)
  } catch {
    allData.value = []
  } finally {
    loading.value = false
  }
}

function onSearch() {
  // filteredData computed 自动响应
}

function onSelectionChange(rows: InventoryItem[]) {
  selectedRows.value = rows
}

function selectAll() {
  tableRef.value?.toggleAllSelection()
}

function clearSelection() {
  tableRef.value?.clearSelection()
}

function generatePreview() {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先从库存台账中勾选需要生成二维码的物料')
    return
  }
  previewItems.value = selectedRows.value.map(i => ({
    materialName: i.materialName,
    materialCode: i.materialCode,
    owner: i.owner,
    department: i.department,
    warehouse: i.warehouse,
    location: i.location,
  }))
  ElMessage.success(`已生成 ${previewItems.value.length} 个标签预览`)
}

function removePreview(idx: number) {
  previewItems.value.splice(idx, 1)
}

function clearPreview() {
  previewItems.value = []
}

function handlePrint() {
  const items = previewItems.value.length > 0
    ? previewItems.value
    : selectedRows.value.map(i => ({
        materialName: i.materialName,
        materialCode: i.materialCode,
        owner: i.owner,
        department: i.department,
        warehouse: i.warehouse,
        location: i.location,
      }))
  if (items.length === 0) {
    ElMessage.warning('请先选择物料并生成预览')
    return
  }
  printLabels(items, props.template)
}

onMounted(loadData)
</script>

<style scoped>
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #303133;
}

.selected-count {
  color: #909399;
  font-size: 13px;
}

.selected-count strong {
  color: var(--el-color-primary);
}

.batch-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 12px;
}

.search-input {
  max-width: 280px;
}

.preview-section {
  margin-top: 16px;
}

.toolbar-right {
  display: flex;
  gap: 8px;
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
}

.empty-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 40px 0;
  color: #c0c4cc;
}

.empty-preview p {
  font-size: 14px;
}
</style>
