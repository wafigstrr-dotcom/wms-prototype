<template>
  <div>
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">入库管理</h1>
      <p class="page-desc">物资入库登记与批量导入</p>
    </div>

    <!-- Tab 切换 -->
    <el-tabs v-model="activeTab" class="inbound-tabs">
      <el-tab-pane v-if="canShowKeeper" label="待办处理" name="process">
        <InboundProcess />
      </el-tab-pane>
      <el-tab-pane v-if="canShowKeeper" label="仓管员入库" name="keeper">
        <KeeperInbound @success="loadRecentRecords" />
      </el-tab-pane>
      <el-tab-pane v-if="canShowEngineer" label="工程师入库" name="engineer">
        <EngineerInbound />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import KeeperInbound from './inbound/KeeperInbound.vue'
import EngineerInbound from './inbound/EngineerInbound.vue'
import InboundProcess from './inbound/InboundProcess.vue'

const authStore = useAuthStore()

const canShowKeeper = computed(() => ['admin', 'keeper'].includes(authStore.userRole))
const canShowEngineer = computed(() => ['admin', 'engineer'].includes(authStore.userRole))

const activeTab = ref(canShowKeeper.value ? 'process' : 'engineer')

function loadRecentRecords() {
  // 子组件会自行刷新
}
</script>

<style scoped>
.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--jc-text-dark);
  margin: 0 0 4px 0;
}

.page-desc {
  font-size: 14px;
  color: var(--jc-text-light);
  margin: 0;
}

.inbound-tabs {
  background: var(--jc-card-white);
  border-radius: var(--jc-radius-card);
  box-shadow: var(--jc-shadow-card);
  padding: 0 24px;
}

.inbound-tabs :deep(.el-tabs__header) {
  margin-bottom: 0;
}
</style>
