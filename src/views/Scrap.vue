<template>
  <div class="scrap-page">
    <el-tabs v-model="activeTab" type="card">
      <el-tab-pane
        v-for="tab in visibleTabs"
        :key="tab.name"
        :label="tab.label"
        :name="tab.name"
      >
        <component :is="tab.component" :ref="(el: any) => setRef(tab.name, el)" v-if="activeTab === tab.name" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import ScrapWorkflow from './scrap/ScrapWorkflow.vue'
import AuctionArchive from './scrap/AuctionArchive.vue'

const authStore = useAuthStore()

// 角色权限矩阵
// admin    → 报废电子流程 + 拍卖流程
// keeper   → 报废电子流程 + 拍卖流程
// engineer → 仅报废电子流程

const allTabs = [
  { name: 'workflow', label: '报废电子流程', component: ScrapWorkflow, roles: ['admin', 'keeper', 'engineer'] },
  { name: 'auction', label: '拍卖流程', component: AuctionArchive, roles: ['admin', 'keeper'] },
]

const visibleTabs = computed(() => allTabs.filter(t => t.roles.includes(authStore.userRole)))

const defaultTab = computed(() => 'workflow')

const activeTab = ref(defaultTab.value)

const componentRefs: Record<string, { refresh?: () => void }> = {}
function setRef(name: string, el: unknown) {
  if (el) componentRefs[name] = el as { refresh?: () => void }
}

watch(activeTab, (tab) => {
  const comp = componentRefs[tab]
  if (comp?.refresh) comp.refresh()
})

onMounted(() => {
  activeTab.value = defaultTab.value
})
</script>
