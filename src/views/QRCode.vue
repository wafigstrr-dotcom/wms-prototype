<template>
  <div class="page-container">
    <div class="page-header">
      <h2 class="page-title">二维码系统</h2>
      <p class="page-desc">物料二维码生成、预览与打印管理</p>
    </div>

    <el-tabs v-model="activeTab" type="border-card">
      <el-tab-pane label="单个生成" name="single">
        <SingleGenerate :template="template" />
      </el-tab-pane>
      <el-tab-pane label="批量生成" name="batch">
        <BatchGenerate :template="template" />
      </el-tab-pane>
      <el-tab-pane label="打印模板" name="template">
        <PrintTemplatePanel @update="onTemplateUpdate" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import SingleGenerate from './qrcode/SingleGenerate.vue'
import BatchGenerate from './qrcode/BatchGenerate.vue'
import PrintTemplatePanel from './qrcode/PrintTemplate.vue'
import { loadTemplate, type PrintTemplate } from './qrcode/templateConfig'

const activeTab = ref('single')
const template = ref<PrintTemplate>(loadTemplate())

function onTemplateUpdate(tpl: PrintTemplate) {
  template.value = { ...tpl }
}
</script>

<style scoped>
.page-container {
  padding: 0;
}

.page-header {
  margin-bottom: 20px;
}

.page-title {
  font-size: 20px;
  font-weight: 700;
  color: #303133;
  margin: 0 0 4px 0;
}

.page-desc {
  font-size: 13px;
  color: #909399;
  margin: 0;
}
</style>
