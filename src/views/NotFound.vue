<template>
  <div>
    <el-empty description="页面不存在" />
    <div class="not-found-actions">
      <router-link to="/">
        <el-button type="primary">返回工作台</el-button>
      </router-link>
    </div>
  </div>
</template>

<style scoped>
.not-found-actions {
  text-align: center;
}
</style>
