<template>
  <div class="planned-page">
    <div class="planned-icon">
      <el-icon :size="48"><Tickets /></el-icon>
    </div>
    <h2 class="planned-title">盘点功能</h2>
    <p class="planned-desc">
      该功能正在规划开发中，将提供库存盘点、差异分析、盘点报告生成等功能。
      敬请期待后续版本更新。
    </p>
    <el-tag type="info" size="large" effect="plain">
      <el-icon><Clock /></el-icon>
      规划中
    </el-tag>
  </div>
</template>

<script setup lang="ts">
import { Tickets, Clock } from '@element-plus/icons-vue'
</script>

<style scoped>
.planned-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  text-align: center;
  padding: 48px;
}
.planned-icon {
  width: 120px;
  height: 120px;
  background: #f5f7fa;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  color: #909399;
}
.planned-title {
  font-size: 28px;
  font-weight: 700;
  color: #303133;
  margin-bottom: 12px;
}
.planned-desc {
  font-size: 14px;
  color: #909399;
  max-width: 500px;
  line-height: 1.6;
  margin-bottom: 20px;
}
</style>
