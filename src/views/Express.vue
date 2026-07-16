<template>
  <div class="express-page">
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
import ExpressApply from './express/ExpressApply.vue'
import ExpressProcess from './express/ExpressProcess.vue'
import ExpressHistory from './express/ExpressHistory.vue'

const authStore = useAuthStore()

// 角色权限矩阵
// admin    → 发运申请 + 待办处理 + 发运记录（全部可见）
// keeper   → 仅待办处理
// engineer → 发运申请 + 发运记录

const allTabs = [
  { name: 'apply',   label: '发运申请', component: ExpressApply,   roles: ['admin', 'engineer'] },
  { name: 'process', label: '待办处理', component: ExpressProcess, roles: ['admin', 'keeper'] },
  { name: 'history', label: '发运记录', component: ExpressHistory, roles: ['admin', 'engineer'] },
]

const visibleTabs = computed(() => allTabs.filter(t => t.roles.includes(authStore.userRole)))

const defaultTab = computed(() => {
  if (authStore.userRole === 'keeper') return 'process'
  return 'apply'
})

const activeTab = ref(defaultTab.value)

// 保存子组件引用，用于切换时刷新数据
const componentRefs: Record<string, { refresh?: () => void }> = {}
function setRef(name: string, el: unknown) {
  if (el) componentRefs[name] = el as { refresh?: () => void }
}

// 切换 Tab 时刷新对应子组件的数据
watch(activeTab, (tab) => {
  const comp = componentRefs[tab]
  if (comp?.refresh) comp.refresh()
})

onMounted(() => {
  activeTab.value = defaultTab.value
})
</script>
