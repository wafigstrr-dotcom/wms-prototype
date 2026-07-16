<template>
  <div class="safety-page">
    <div class="page-header">
      <el-icon color="#E6A23C" :size="20"><Warning /></el-icon>
      <span class="page-title">安全库存预警</span>
      <el-tag type="warning" size="small">实时监控</el-tag>
    </div>
    <SafetyQuery />
  </div>
</template>

<script setup lang="ts">
import SafetyQuery from './query/SafetyQuery.vue'
</script>

<style scoped>
.safety-page { background: transparent; }
.page-header {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,.06);
}
.page-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}
</style>
