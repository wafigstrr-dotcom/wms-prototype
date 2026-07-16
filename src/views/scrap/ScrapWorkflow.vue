<template>
  <div class="scrap-workflow">
    <el-tabs v-model="activeTab" type="card">
      <el-tab-pane
        v-for="tab in tabs"
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
import { ref, watch } from 'vue'
import ScrapApply from './ScrapApply.vue'
import ScrapMyApply from './ScrapMyApply.vue'

const tabs = [
  { name: 'apply', label: '报废申请', component: ScrapApply },
  { name: 'myapply', label: '我的申请', component: ScrapMyApply },
]

const activeTab = ref('apply')

const componentRefs: Record<string, { refresh?: () => void }> = {}
function setRef(name: string, el: unknown) {
  if (el) componentRefs[name] = el as { refresh?: () => void }
}

watch(activeTab, (tab) => {
  const comp = componentRefs[tab]
  if (comp?.refresh) comp.refresh()
})

function refresh() {
  const comp = componentRefs[activeTab.value]
  if (comp?.refresh) comp.refresh()
}

defineExpose({ refresh })
</script>
