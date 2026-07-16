<template>
  <div class="express-history">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-input
          v-model="keyword"
          placeholder="搜索发运单号、物料、收件人..."
          clearable
          class="search-input"
          @input="onSearch"
          @clear="loadHistory"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
      </div>
    </div>

    <!-- 表格 -->
    <el-table
      :data="pageData"
      stripe
      border
      size="small"
      v-loading="loading"
      class="data-table"
    >
      <el-table-column type="index" label="序号" width="60" align="center"
        :index="(i: number) => (page - 1) * PAGE_SIZE + i + 1" />
      <el-table-column prop="flowNo" label="发运单号" min-width="130" show-overflow-tooltip />
      <el-table-column prop="creator" label="申请人" width="100" align="center" />
      <el-table-column label="物料描述" min-width="140" show-overflow-tooltip>
        <template #default="{ row }">{{ (row.data as Record<string, unknown>).materialDesc || '-' }}</template>
      </el-table-column>
      <el-table-column label="发运原因" min-width="120" show-overflow-tooltip>
        <template #default="{ row }">{{ (row.data as Record<string, unknown>).shipReason || '-' }}</template>
      </el-table-column>
      <el-table-column label="收件人" width="90" align="center">
        <template #default="{ row }">{{ (row.data as Record<string, unknown>).recipient || '-' }}</template>
      </el-table-column>
      <el-table-column label="快递单号" min-width="120" show-overflow-tooltip>
        <template #default="{ row }">
          <span class="mono">{{ getTrackingNumber(row) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="重量" width="80" align="center">
        <template #default="{ row }">{{ getWeight(row) }} kg</template>
      </el-table-column>
      <el-table-column label="件数" width="70" align="center">
        <template #default="{ row }">{{ getPieces(row) }}</template>
      </el-table-column>
      <el-table-column label="金额" width="90" align="center">
        <template #default="{ row }">{{ getAmount(row) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === 'completed' ? 'success' : 'warning'" size="small">
            {{ row.status === 'completed' ? '已完成' : '处理中' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="申请时间" min-width="120">
        <template #default="{ row }">{{ formatDateTime(row.createTime) }}</template>
      </el-table-column>
    </el-table>

    <div class="pagination-bar">
      <span class="record-count">
        共 {{ filteredList.length }} 条记录
      </span>
      <el-pagination
        v-model:current-page="page"
        :page-size="PAGE_SIZE"
        :total="filteredList.length"
        layout="prev, pager, next"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { getAllFlows, type FlowItem } from '@/api/flows.api'

const PAGE_SIZE = 10

const authStore = useAuthStore()
const loading = ref(false)
const allFlows = ref<FlowItem[]>([])
const keyword = ref('')
const page = ref(1)

let searchTimer: ReturnType<typeof setTimeout> | null = null

function onSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1 }, 300)
}

const filteredList = computed(() => {
  let list = allFlows.value
  // engineer 只看本人
  if (authStore.userRole === 'engineer' && authStore.user) {
    list = list.filter(f => f.creatorId === authStore.user!.id)
  }
  // 关键词搜索
  if (keyword.value.trim()) {
    const kw = keyword.value.trim().toLowerCase()
    list = list.filter(f => {
      const d = f.data as Record<string, unknown>
      return (
        f.flowNo.toLowerCase().includes(kw) ||
        f.creator.toLowerCase().includes(kw) ||
        String(d.materialDesc || '').toLowerCase().includes(kw) ||
        String(d.recipient || '').toLowerCase().includes(kw)
      )
    })
  }
  return list
})

const pageData = computed(() => {
  const s = (page.value - 1) * PAGE_SIZE
  return filteredList.value.slice(s, s + PAGE_SIZE)
})

function getTrackingNumber(row: Record<string, unknown>): string {
  const r = row as unknown as FlowItem
  if (r.status === 'completed' && r.approveComment) {
    try {
      const info = JSON.parse(r.approveComment)
      return info.trackingNumber || '-'
    } catch { return '-' }
  }
  return '-'
}

function getWeight(row: Record<string, unknown>): string {
  const r = row as unknown as FlowItem
  if (r.status === 'completed' && r.approveComment) {
    try {
      const info = JSON.parse(r.approveComment)
      return info.weight ? String(info.weight) : '-'
    } catch { return '-' }
  }
  return '-'
}

function getPieces(row: Record<string, unknown>): string {
  const r = row as unknown as FlowItem
  if (r.status === 'completed' && r.approveComment) {
    try {
      const info = JSON.parse(r.approveComment)
      return info.pieces ? String(info.pieces) : '-'
    } catch { return '-' }
  }
  return '-'
}

function getAmount(row: Record<string, unknown>): string {
  const r = row as unknown as FlowItem
  if (r.status === 'completed' && r.approveComment) {
    try {
      const info = JSON.parse(r.approveComment)
      return info.amount ? `¥${info.amount}` : '-'
    } catch { return '-' }
  }
  return '-'
}

function formatDateTime(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

async function loadHistory() {
  loading.value = true
  try {
    const res = await getAllFlows({ type: 'express' })
    if (res.code === 200) {
      allFlows.value = res.data.list || []
    }
  } finally {
    loading.value = false
  }
}

watch(() => page.value, () => { /* page change triggers computed */ })

onMounted(() => {
  loadHistory()
})

defineExpose({ refresh: loadHistory })
</script>

<style scoped>
.express-history {
  display: flex;
  flex-direction: column;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.toolbar-left {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-input {
  width: 280px;
}

.data-table {
  width: 100%;
  margin-top: 16px;
}

.mono {
  font-family: monospace;
}

.record-count {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.pagination-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
}
</style>
