<template>
  <div class="engineer-inbound">
    <!-- 提示信息 -->
    <el-alert
      title="通过PO号检索直接物料维护数据，在子项「入库数量」下拉框中选择数量即视为选中入库（清空即取消），填写入库原因后提交，生成电子流转单至仓管员补充仓库和货位信息。"
      type="info"
      show-icon
      :closable="false"
      class="engineer-hint"
    />

    <!-- 搜索区 -->
    <div class="search-section">
      <div class="search-bar">
        <el-input
          v-model="searchKeyword"
          placeholder="输入PO号搜索直接物料记录（支持模糊匹配）"
          clearable
          class="po-search"
          @keyup.enter="handleSearch"
          @clear="clearSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-button type="primary" :loading="searching" @click="handleSearch">
          <el-icon><Search /></el-icon> 搜索
        </el-button>
      </div>
    </div>

    <!-- 搜索结果 -->
    <div v-loading="searching" class="results-section">
      <div v-if="searchResults.length > 0" class="results-header">
        <span>找到 {{ searchResults.length }} 条匹配记录</span>
      </div>

      <div v-if="!searching && searchResults.length === 0 && hasSearched" class="empty-results">
        <el-empty description="未找到匹配的直接物料记录" />
      </div>

      <div v-for="record in searchResults" :key="record.id" class="record-card">
        <!-- 主记录信息 -->
        <div class="record-header" @click="toggleExpand(record.id)">
          <div class="record-main-info">
            <span class="po-tag">{{ record.poNo }}</span>
            <span class="record-field">{{ record.purchaseDescription }}</span>
            <span class="record-field">供应商: {{ record.supplierName || record.supplierCode }}</span>
            <span class="record-field">数量: {{ record.quantity }}</span>
            <span class="record-field">下单: {{ record.orderDate }}</span>
          </div>
          <el-icon class="expand-icon" :class="{ 'is-expanded': expandedIds.has(record.id) }">
            <ArrowRight />
          </el-icon>
        </div>

        <!-- 子项表格 -->
        <div v-if="expandedIds.has(record.id)" class="sub-items-section" v-loading="subLoading[record.id]">
          <el-table :data="subItemsMap[record.id] || []" size="small" border class="sub-table">
            <el-table-column prop="sapDrawingNo" label="SAP号/图号" min-width="140" />
            <el-table-column prop="purchaseDescription" label="物料名称" min-width="200" show-overflow-tooltip />
            <el-table-column prop="quantity" label="原始数量" width="100" align="center" />
            <el-table-column label="入库数量（选择即入库）" width="160" align="center">
              <template #default="{ row: sub }">
                <el-select
                  v-model="inboundQtyMap[`${record.id}-${sub.id}`]"
                  placeholder="不入库"
                  clearable
                  size="small"
                  class="qty-select"
                >
                  <el-option v-for="n in qtyOptions(sub.quantity)" :key="n" :label="String(n)" :value="n" />
                </el-select>
              </template>
            </el-table-column>
            <template #empty>
              <el-empty description="该PO记录暂无子项" :image-size="60" />
            </template>
          </el-table>
        </div>
      </div>
    </div>

    <!-- 底部：已选汇总 + 入库原因 + 提交 -->
    <div v-if="selectedItems.length > 0" class="selection-summary">
      <div class="summary-header">
        <div class="summary-title">
          <el-icon><Checked /></el-icon>
          已选 {{ selectedItems.length }} 项待入库
        </div>
        <el-button type="danger" size="small" text @click="clearAllSelections">
          <el-icon><Delete /></el-icon> 清空选择
        </el-button>
      </div>

      <div class="selected-list">
        <div v-for="item in selectedItems" :key="`${item.parentId}-${item.subItemId}`" class="selected-item-row">
          <div class="selected-item-info">
            <span class="selected-po">{{ item.poNo }}</span>
            <span class="selected-name">{{ item.materialName }}</span>
            <span class="selected-sap" v-if="item.sapDrawingNo">({{ item.sapDrawingNo }})</span>
            <span class="selected-qty">原始: {{ item.originalQty }}</span>
          </div>
          <div class="selected-item-qty">
            <span>入库:</span>
            <el-select
              v-model="inboundQtyMap[`${item.parentId}-${item.subItemId}`]"
              placeholder="不入库"
              clearable
              size="small"
              class="qty-select-small"
            >
              <el-option v-for="n in qtyOptions(item.originalQty)" :key="n" :label="String(n)" :value="n" />
            </el-select>
            <el-button type="danger" size="small" text @click="removeItem(item)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </div>
      </div>

      <!-- 入库原因 -->
      <div class="reason-section">
        <el-form-item label="入库原因" required class="reason-form-item">
          <el-input
            v-model="inboundReason"
            type="textarea"
            :rows="2"
            placeholder="请输入入库原因（必填）"
          />
        </el-form-item>
      </div>

      <!-- 提交按钮 -->
      <div class="form-actions">
        <el-button type="primary" :loading="submitting" :disabled="!canSubmit" @click="handleSubmit">
          <el-icon v-if="!submitting"><Promotion /></el-icon>
          {{ submitting ? '提交中...' : '提交申请' }}
        </el-button>
        <el-button @click="clearAllSelections">
          <el-icon><RefreshRight /></el-icon> 重置
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, ArrowRight, Checked, Delete, Promotion, RefreshRight } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { createFlow } from '@/api/inbound.api'
import { getDirectMaterials, getSubItems } from '@/api/directMaterial.api'
import type { DirectMaterial, DirectMaterialSubItem } from '@/types'

const authStore = useAuthStore()

// ==================== 搜索状态 ====================
const searchKeyword = ref('')
const searching = ref(false)
const searchResults = ref<DirectMaterial[]>([])
const hasSearched = ref(false)

// ==================== 展开 & 子项 ====================
const expandedIds = ref<Set<number>>(new Set())
const subItemsMap = reactive<Record<number, DirectMaterialSubItem[]>>({})
const subLoading = reactive<Record<number, boolean>>({})

// ==================== 选择状态 ====================
// 每个子项的入库数量（选择数量=选中入库，清空=不入库）: key = `${parentId}-${subItemId}`
const inboundQtyMap = reactive<Record<string, number | undefined | ''>>({})
// 每个子项对应的PO号: key = `${parentId}-${subItemId}`
const poNoMap = reactive<Record<string, string>>({})

// ==================== 入库原因 ====================
const inboundReason = ref('')
const submitting = ref(false)

// ==================== 计算属性 ====================
const selectedItems = computed(() => {
  const items: Array<{
    parentId: number
    subItemId: number
    poNo: string
    sapDrawingNo: string
    materialName: string
    originalQty: number
    inboundQty: number
  }> = []
  for (const [key, qty] of Object.entries(inboundQtyMap)) {
    if (qty == null || qty === '') continue
    const [parentIdStr, subItemIdStr] = key.split('-')
    const parentId = Number(parentIdStr)
    const subItemId = Number(subItemIdStr)
    const subs = subItemsMap[parentId] || []
    const sub = subs.find(s => s.id === subItemId)
    if (!sub) continue
    items.push({
      parentId,
      subItemId,
      poNo: poNoMap[key] || '',
      sapDrawingNo: sub.sapDrawingNo,
      materialName: sub.purchaseDescription,
      originalQty: sub.quantity,
      inboundQty: Number(qty),
    })
  }
  return items
})

const canSubmit = computed(() => selectedItems.value.length > 0 && inboundReason.value.trim().length > 0)

// ==================== 搜索 ====================
async function handleSearch() {
  const kw = searchKeyword.value.trim()
  if (!kw) {
    ElMessage.warning('请输入PO号或关键词')
    return
  }
  searching.value = true
  hasSearched.value = true
  try {
    const res = await getDirectMaterials({ keyword: kw })
    searchResults.value = res.data.list || []
  } catch {
    ElMessage.error('搜索失败，请重试')
    searchResults.value = []
  } finally {
    searching.value = false
  }
}

function clearSearch() {
  searchResults.value = []
  hasSearched.value = false
}

// ==================== 展开/折叠 ====================
async function toggleExpand(parentId: number) {
  if (expandedIds.value.has(parentId)) {
    expandedIds.value.delete(parentId)
  } else {
    expandedIds.value.add(parentId)
    if (!subItemsMap[parentId]) {
      await loadSubItems(parentId)
    }
  }
}

async function loadSubItems(parentId: number) {
  subLoading[parentId] = true
  try {
    const res = await getSubItems(parentId)
    subItemsMap[parentId] = res.data || []
    // 记录子项对应的PO号（提交时使用）；入库数量默认为空（不入库）
    const record = searchResults.value.find(r => r.id === parentId)
    for (const sub of subItemsMap[parentId]) {
      const key = `${parentId}-${sub.id}`
      if (record && !poNoMap[key]) {
        poNoMap[key] = record.poNo
      }
    }
  } catch {
    subItemsMap[parentId] = []
  } finally {
    subLoading[parentId] = false
  }
}

// ==================== 子项选择 ====================
// 生成入库数量下拉选项：1 ~ 原始数量
function qtyOptions(max: number): number[] {
  return Array.from({ length: Math.max(1, Math.floor(Number(max) || 1)) }, (_, i) => i + 1)
}

// 移除单个已选子项
function removeItem(item: { parentId: number; subItemId: number }) {
  delete inboundQtyMap[`${item.parentId}-${item.subItemId}`]
}

function clearAllSelections() {
  for (const key of Object.keys(inboundQtyMap)) {
    delete inboundQtyMap[key]
  }
  inboundReason.value = ''
}

// ==================== 提交 ====================
async function handleSubmit() {
  if (!canSubmit.value) {
    ElMessage.warning('请至少选择一项并填写入库原因')
    return
  }

  const user = authStore.user
  if (!user) {
    ElMessage.error('请先登录')
    return
  }

  submitting.value = true
  try {
    // 收集所有PO号（去重）
    const poNos = [...new Set(selectedItems.value.map(i => i.poNo).filter(Boolean))]

    const flowData = {
      poNos,
      inboundReason: inboundReason.value.trim(),
      items: selectedItems.value.map(item => ({
        parentId: item.parentId,
        subItemId: item.subItemId,
        poNo: item.poNo,
        sapDrawingNo: item.sapDrawingNo,
        materialName: item.materialName,
        inboundQty: item.inboundQty,
        originalQty: item.originalQty,
      })),
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
      data: flowData as unknown as Record<string, unknown>,
      approver: '',
    })

    if (res.code === 200) {
      ElMessage.success(`入库申请 ${res.data.flowNo} 已提交，等待仓管员处理`)
      // 重置状态
      searchKeyword.value = ''
      searchResults.value = []
      hasSearched.value = false
      expandedIds.value.clear()
      clearAllSelections()
    } else {
      ElMessage.error(res.message || '提交失败')
    }
  } catch {
    ElMessage.error('提交失败，请重试')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.full-width { width: 100%; }
.engineer-inbound { padding: 24px 0; }

.engineer-hint { margin-bottom: 20px; }

/* 搜索区 */
.search-section { margin-bottom: 20px; }
.search-bar { display: flex; gap: 12px; align-items: center; }
.po-search { width: 420px; }

/* 搜索结果 */
.results-section { margin-bottom: 20px; }
.results-header {
  font-size: 13px;
  color: var(--jc-text-light);
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--jc-border-line-light);
}

.empty-results { padding: 20px 0; }

/* 记录卡片 */
.record-card {
  border: 1px solid var(--jc-border-line-light);
  border-radius: var(--jc-radius-card);
  margin-bottom: 12px;
  overflow: hidden;
  transition: border-color 0.2s;
}
.record-card:hover { border-color: var(--jc-accent-teal); }

.record-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  cursor: pointer;
  background: var(--jc-bg-gray);
  transition: background 0.2s;
}
.record-header:hover { background: var(--jc-hover-bg, #f5f5f5); }

.record-main-info {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  font-size: 13px;
}

.po-tag {
  background: rgba(0, 128, 128, 0.1);
  color: var(--jc-accent-teal);
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
  font-family: monospace;
  font-size: 12px;
}

.record-field { color: var(--jc-text-light); }

.expand-icon {
  transition: transform 0.2s;
  color: var(--jc-text-light);
}
.expand-icon.is-expanded { transform: rotate(90deg); }

/* 子项区 */
.sub-items-section { padding: 12px 16px; border-top: 1px solid var(--jc-border-line-light); }
.sub-table { width: 100%; }
.qty-select { width: 130px; }

/* 已选汇总 */
.selection-summary {
  border: 1px solid var(--jc-border-line-light);
  border-radius: var(--jc-radius-card);
  padding: 20px;
  background: var(--jc-card-white);
  margin-top: 8px;
}

.summary-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--jc-border-line-light);
}

.summary-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--jc-text-dark);
  display: flex;
  align-items: center;
  gap: 6px;
}
.summary-title .el-icon { color: var(--jc-accent-teal); }

.selected-list {
  max-height: 240px;
  overflow-y: auto;
  margin-bottom: 16px;
}

.selected-item-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 6px;
  margin-bottom: 4px;
  background: var(--jc-bg-gray);
}

.selected-item-info {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  flex: 1;
  min-width: 0;
}

.selected-po {
  background: rgba(0, 128, 128, 0.1);
  color: var(--jc-accent-teal);
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 11px;
  font-family: monospace;
  font-weight: 600;
  flex-shrink: 0;
}

.selected-name {
  color: var(--jc-text-dark);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.selected-sap { color: var(--jc-text-light); font-size: 12px; flex-shrink: 0; }
.selected-qty { color: var(--jc-text-light); font-size: 12px; flex-shrink: 0; }

.selected-item-qty {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  flex-shrink: 0;
  margin-left: 12px;
}
.qty-select-small { width: 100px; }

/* 入库原因 */
.reason-section { margin-bottom: 16px; }
.reason-form-item { margin-bottom: 0; }

/* 提交按钮 */
.form-actions {
  display: flex;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--jc-border-line-light);
}
</style>
