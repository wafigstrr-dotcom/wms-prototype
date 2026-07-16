<script setup lang="ts">
// App.vue 根组件：仅作为路由出口
</script>

<template>
  <router-view />
</template>

<style scoped>
/* 全局过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
