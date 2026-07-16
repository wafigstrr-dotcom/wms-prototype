<template>
  <div class="outbound-page">
    <el-tabs v-model="activeTab" type="card">
      <el-tab-pane
        v-for="tab in visibleTabs"
        :key="tab.name"
        :label="tab.label"
        :name="tab.name"
      >
        <component :is="tab.component" v-if="activeTab === tab.name" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import RequestOutbound from './outbound/RequestOutbound.vue'
import ScrapOutbound from './outbound/ScrapOutbound.vue'
import MyApplications from './outbound/MyApplications.vue'

const auth = useAuthStore()

// 角色权限矩阵
// admin    → 领用出库 + 报废出库 + 我的申请（全部可见）
// keeper   → 报废出库 + 我的申请（隐藏领用出库，默认激活报废）
// engineer → 领用出库 + 我的申请（隐藏报废出库）

const allTabs = [
  { name: 'request', label: '领用出库', component: RequestOutbound, roles: ['admin', 'engineer'] },
  { name: 'scrap',   label: '报废出库', component: ScrapOutbound,   roles: ['admin', 'keeper'] },
  { name: 'myapply', label: '我的申请', component: MyApplications,  roles: ['admin', 'keeper', 'engineer'] },
]

const visibleTabs = computed(() => allTabs.filter(t => t.roles.includes(auth.userRole)))

const defaultTab = computed(() => {
  if (auth.userRole === 'keeper') return 'scrap'
  return 'request'
})

const activeTab = ref(defaultTab.value)

onMounted(() => {
  activeTab.value = defaultTab.value
})
</script>
