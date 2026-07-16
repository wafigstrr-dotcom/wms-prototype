<template>
  <div class="query-center">
    <el-tabs v-model="activeTab" type="card" @tab-change="onTabChange">
      <el-tab-pane label="库存查询" name="stock">
        <StockQuery v-if="activeTab === 'stock'" />
      </el-tab-pane>
      <el-tab-pane label="入库查询" name="inbound">
        <InboundQuery v-if="activeTab === 'inbound'" />
      </el-tab-pane>
      <el-tab-pane label="出库查询" name="outbound">
        <OutboundQuery v-if="activeTab === 'outbound'" />
      </el-tab-pane>
      <el-tab-pane label="账龄查询" name="aging">
        <AgingQuery v-if="activeTab === 'aging'" />
      </el-tab-pane>
      <el-tab-pane label="呆滞查询" name="dormant">
        <DormantQuery v-if="activeTab === 'dormant'" />
      </el-tab-pane>
      <el-tab-pane name="visual">
        <template #label><el-icon><DataAnalysis /></el-icon> 可视化</template>
        <VisualQuery v-if="activeTab === 'visual'" />
      </el-tab-pane>
      <el-tab-pane label="库位查询" name="location">
        <LocationQuery v-if="activeTab === 'location'" />
      </el-tab-pane>
      <el-tab-pane label="物料历史查询" name="history">
        <HistoryQuery v-if="activeTab === 'history'" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import type { TabPaneName } from 'element-plus'
import StockQuery from './query/StockQuery.vue'
import InboundQuery from './query/InboundQuery.vue'
import OutboundQuery from './query/OutboundQuery.vue'
import AgingQuery from './query/AgingQuery.vue'
import DormantQuery from './query/DormantQuery.vue'
import VisualQuery from './query/VisualQuery.vue'
import LocationQuery from './query/LocationQuery.vue'
import HistoryQuery from './query/HistoryQuery.vue'

const route = useRoute()

const validTabs = ['stock', 'inbound', 'outbound', 'aging', 'dormant', 'visual', 'location', 'history']
function getInitialTab(): string {
  const tabParam = (route.query.tab as string) || ''
  if (validTabs.includes(tabParam)) return tabParam
  return 'stock'
}

const activeTab = ref(getInitialTab())

function onTabChange(_tab: TabPaneName) {
  // 可扩展：同步 URL query 参数
}
</script>

<style scoped>
.query-center {
  background: transparent;
}
.query-center :deep(.el-tabs__header) {
  background: #fff;
  border-radius: 8px 8px 0 0;
  padding: 0 16px;
  margin-bottom: 0;
}
.query-center :deep(.el-tabs__content) {
  padding: 12px 0 0 0;
}
.query-center :deep(.el-tabs__item) {
  font-weight: 600;
  font-size: 14px;
}
</style>
