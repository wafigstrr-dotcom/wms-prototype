<template>
  <div class="my-applications">
    <el-card shadow="never">
      <template #header>
        <div class="header-row">
          <span><el-icon><Document /></el-icon> 我的出库申请</span>
          <el-button type="primary" plain size="small" @click="loadData">
            <el-icon><Refresh /></el-icon> 刷新
          </el-button>
        </div>
      </template>

      <div v-loading="loading">
        <div v-if="flows.length === 0">
          <el-empty description="暂无出库申请记录" />
        </div>

        <el-row :gutter="16" v-else>
          <el-col :span="12" v-for="flow in flows" :key="flow.id" class="flow-col">
            <el-card shadow="hover" class="flow-card">
              <div class="flow-card-header">
                <el-tag :type="flow.type === 'outbound_request' ? 'primary' : 'danger'" size="small">
                  {{ flow.type === 'outbound_request' ? '领用出库' : '报废出库' }}
                </el-tag>
                <span class="flow-no">{{ flow.flowNo }}</span>
              </div>

              <div class="flow-info">
                <div class="info-row">
                  <span class="label">申请时间：</span>
                  <span>{{ formatTime(flow.createTime) }}</span>
                </div>
                <div class="info-row">
                  <span class="label">物料摘要：</span>
                  <span class="summary">{{ getItemsSummary(flow) }}</span>
                </div>
                <div class="info-row">
                  <span class="label">审批经理：</span>
                  <span>{{ flow.approver || '待分配' }}</span>
                </div>
              </div>

              <div class="flow-footer">
                <el-tag
                  :type="statusType(flow.status)"
                  size="small"
                  effect="plain"
                >
                  {{ statusLabel(flow.status) }}
                </el-tag>
                <span v-if="flow.approveComment" class="comment">
                  批注：{{ flow.approveComment }}
                </span>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Document, Refresh } from '@element-plus/icons-vue'
import { getMyOutboundFlows } from '@/api/outbound.api'
import { useAuthStore } from '@/stores/auth'
import type { Flow } from '@/types'

const auth = useAuthStore()
const loading = ref(false)
const flows = ref<Flow[]>([])

function formatTime(iso: string): string {
  if (!iso) return '-'
  const d = new Date(iso)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function getItemsSummary(flow: Flow): string {
  const items = (flow.data as any)?.items
  if (!Array.isArray(items) || items.length === 0) return '-'
  const qtyField = flow.type === 'outbound_request' ? 'reqQty' : 'scrapQty'
  return items.slice(0, 3).map((i: any) => `${i.materialName}(${i[qtyField] || '?'})`).join('、') +
    (items.length > 3 ? ` ...等${items.length}项` : '')
}

function statusType(status: string): 'primary' | 'success' | 'warning' | 'info' | 'danger' {
  const map: Record<string, 'primary' | 'success' | 'warning' | 'info' | 'danger'> = {
    pending: 'warning', approving: 'primary', approved: 'success', rejected: 'danger', completed: 'success',
  }
  return map[status] || 'info'
}

function statusLabel(status: string): string {
  const map: Record<string, string> = { pending: '待审批', approving: '审批中', approved: '已通过', rejected: '已驳回', completed: '已完成' }
  return map[status] || status
}

async function loadData() {
  loading.value = true
  try {
    const res = await getMyOutboundFlows(auth.userName)
    flows.value = (res.data.list || []).filter((f: Flow) =>
      f.type === 'outbound_request' || f.type === 'outbound_scrap'
    )
  } finally { loading.value = false }
}

onMounted(() => { loadData() })
</script>

<style scoped>
.header-row { display: flex; justify-content: space-between; align-items: center; }
.flow-col { margin-bottom: 16px; }
.flow-card { cursor: default; }
.flow-card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.flow-no { font-weight: 600; font-size: 14px; color: var(--el-text-color-primary); }
.flow-info { margin-bottom: 12px; }
.info-row { font-size: 13px; color: var(--el-text-color-regular); margin-bottom: 4px; }
.info-row .label { color: var(--el-text-color-secondary); }
.info-row .summary { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px; display: inline-block; vertical-align: bottom; }
.flow-footer { display: flex; align-items: center; gap: 12px; }
.flow-footer .comment { font-size: 12px; color: var(--el-text-color-secondary); }
</style>
