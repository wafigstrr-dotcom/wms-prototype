import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '工作台', roles: ['admin', 'keeper', 'engineer'] },
      },
      {
        path: 'inbound',
        name: 'Inbound',
        component: () => import('@/views/Inbound.vue'),
        meta: { title: '入库管理', roles: ['admin', 'keeper', 'engineer'] },
      },
      {
        path: 'query',
        name: 'Query',
        component: () => import('@/views/Query.vue'),
        meta: { title: '综合查询', roles: ['admin', 'keeper', 'engineer'] },
      },
      {
        path: 'transfer',
        name: 'Transfer',
        component: () => import('@/views/Transfer.vue'),
        meta: { title: '移库管理', roles: ['admin', 'keeper', 'engineer'] },
      },
      {
        path: 'outbound',
        name: 'Outbound',
        component: () => import('@/views/Outbound.vue'),
        meta: { title: '出库管理', roles: ['admin', 'keeper', 'engineer'] },
      },
      {
        path: 'express',
        name: 'Express',
        component: () => import('@/views/Express.vue'),
        meta: { title: '快递发运', roles: ['admin', 'keeper', 'engineer'] },
      },
      {
        path: 'scrap',
        name: 'Scrap',
        component: () => import('@/views/Scrap.vue'),
        meta: { title: '报废处理', roles: ['admin', 'keeper', 'engineer'] },
      },
      {
        path: 'qrcode',
        name: 'QRCode',
        component: () => import('@/views/QRCode.vue'),
        meta: { title: '二维码系统', roles: ['admin', 'keeper', 'engineer'] },
      },
      {
        path: 'safety',
        name: 'Safety',
        component: () => import('@/views/SafetyPage.vue'),
        meta: { title: '安全库存预警', roles: ['admin', 'keeper', 'engineer'] },
      },
      {
        path: 'inventory',
        name: 'Inventory',
        component: () => import('@/views/Inventory.vue'),
        meta: { title: '盘点', roles: ['admin', 'keeper', 'engineer'] },
      },
      {
        path: 'prototype',
        name: 'Prototype',
        component: () => import('@/views/Prototype.vue'),
        meta: { title: '样机试制/改工', roles: ['admin', 'keeper', 'engineer'] },
      },
      {
        path: 'tooling',
        name: 'Tooling',
        component: () => import('@/views/Tooling.vue'),
        meta: { title: '工装制作', roles: ['admin', 'keeper', 'engineer'] },
      },
      {
        path: 'config',
        name: 'Config',
        component: () => import('@/views/Config.vue'),
        meta: { title: '仓库配置', roles: ['admin', 'keeper'] },
      },
      {
        path: 'direct-material',
        name: 'DirectMaterial',
        component: () => import('@/views/DirectMaterial.vue'),
        meta: { title: '直接物料维护', roles: ['admin', 'keeper', 'engineer'] },
      },
      {
        path: 'users',
        name: 'Users',
        component: () => import('@/views/Users.vue'),
        meta: { title: '用户设置', roles: ['admin'] },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue'),
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

// 权限守卫
router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()

  // 不需要认证的页面（登录页）
  if (to.meta.requiresAuth === false) {
    // 已登录用户访问登录页 → 跳转工作台
    if (authStore.isLoggedIn) {
      next({ name: 'Dashboard' })
    } else {
      next()
    }
    return
  }

  // 需要认证的页面
  if (!authStore.isLoggedIn) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
    return
  }

  // 角色权限检查
  const requiredRoles = to.meta.roles as string[] | undefined
  if (requiredRoles && !requiredRoles.includes(authStore.user?.role || '')) {
    next({ name: 'Dashboard' })
    return
  }

  next()
})

export default router
