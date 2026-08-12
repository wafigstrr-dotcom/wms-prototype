<template>
  <div class="app-container">
    <!-- 侧边栏 -->
    <aside class="sidebar" :class="{ collapsed: appStore.sidebarCollapsed }">
      <div class="sidebar-header">
        <div class="sidebar-logo">
          <div class="logo-icon" style="background: none; border: none; overflow: visible;">
            <img :src="logoUrl" alt="logo" style="width: 100%; height: 100%; object-fit: contain;" />
          </div>
          <span>myPrototype</span>
        </div>
      </div>

      <button class="sidebar-toggle" @click="appStore.toggleSidebar">
        <el-icon :size="12">
          <component :is="appStore.sidebarCollapsed ? 'ArrowRight' : 'ArrowLeft'" />
        </el-icon>
      </button>

      <nav class="sidebar-nav">
        <div v-for="section in menuConfig" :key="section.title" class="nav-section">
          <div class="nav-section-title">{{ section.title }}</div>
          <ul class="nav-menu">
            <li v-for="item in filterByRole(section.items)" :key="item.path" class="nav-item">
              <router-link
                v-if="!item.planned"
                :to="item.path"
                class="nav-link"
              >
                <el-icon><component :is="item.icon" /></el-icon>
                <span>{{ item.label }}</span>
                <span v-if="item.adminOnly" class="nav-badge-admin">Admin</span>
              </router-link>
              <a v-else class="nav-link planned" href="javascript:void(0)">
                <el-icon><component :is="item.icon" /></el-icon>
                <span>{{ item.label }}</span>
                <span class="nav-badge-soon">规划中</span>
              </a>
            </li>
          </ul>
        </div>
      </nav>

      <div class="sidebar-footer">
        <div class="sidebar-user">
          <div class="sidebar-user-avatar">
            {{ authStore.userName.charAt(0) || 'U' }}
          </div>
          <div class="sidebar-user-details">
            <div class="sidebar-user-name">{{ authStore.userName }}</div>
            <div class="sidebar-user-role">{{ roleLabel }}</div>
          </div>
        </div>
      </div>
    </aside>

    <!-- 主内容区 -->
    <main class="main-content">
      <header class="top-header">
        <h1 class="page-title">{{ currentTitle }}</h1>
        <div class="header-actions">
          <button class="header-action-btn" title="通知">
            <el-icon :size="18"><Bell /></el-icon>
          </button>
          <button class="header-action-btn" title="退出登录" @click="handleLogout">
            <el-icon :size="18"><SwitchButton /></el-icon>
          </button>
        </div>
      </header>

      <div class="content-wrapper">
        <div class="content-container">
          <router-view />
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import logoUrl from '@/assets/logo.webp'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const appStore = useAppStore()

// ==================== 菜单配置（对应 SPEC §3） ====================
interface MenuItem {
  label: string
  icon: string
  path: string
  roles?: string[]       // 允许访问的角色，不填则全部可见
  adminOnly?: boolean    // 仅管理员可见
  planned?: boolean      // 规划中（灰色禁用）
}

interface MenuSection {
  title: string
  items: MenuItem[]
}

const menuConfig: MenuSection[] = [
  {
    title: '仓库管理 Warehouse',
    items: [
      { label: '工作台看板',   icon: 'Odometer',          path: '/' },
      { label: '入库',         icon: 'Download',          path: '/inbound' },
      { label: '出库',         icon: 'Upload',            path: '/outbound' },
      { label: '移库',         icon: 'Sort',              path: '/transfer' },
      { label: '安全库存预警', icon: 'Warning',           path: '/safety' },
      { label: '综合查询',     icon: 'Search',            path: '/query' },
      { label: '盘点',         icon: 'Tickets',           path: '/inventory' },
      { label: '快递发运',     icon: 'Van',               path: '/express' },
      { label: '报废处理',     icon: 'Delete',            path: '/scrap' },
      { label: '二维码系统',   icon: 'Grid',              path: '/qrcode' },
      { label: '仓库配置',     icon: 'Setting',           path: '/config' },
      { label: '直接物料维护', icon: 'Document',          path: '/direct-material' },
      { label: '用户设置',     icon: 'UserFilled',        path: '/users', adminOnly: true, roles: ['admin'] },
    ],
  },
  {
    title: '样机试制 Prototyping',
    items: [
      { label: '样机试制/改工', icon: 'SetUp',          path: '/prototype' },
      { label: '工装制作',      icon: 'Tools',          path: '/tooling' },
    ],
  },
]

// 按角色过滤菜单
function filterByRole(items: MenuItem[]): MenuItem[] {
  const role = authStore.userRole
  return items.filter(item => {
    // adminOnly 项仅 admin 可见
    if (item.adminOnly && role !== 'admin') return false
    // 有 roles 限制时检查是否包含当前角色
    if (item.roles && !item.roles.includes(role)) return false
    return true
  })
}

const currentTitle = computed(() => (route.meta.title as string) || '工作台')

const roleLabel = computed(() => {
  const map: Record<string, string> = {
    admin: '系统管理员',
    keeper: '仓管员',
    engineer: '工程师',
  }
  return map[authStore.userRole] || authStore.userRole
})

async function handleLogout() {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    authStore.logout()
    ElMessage.success('已退出登录')
    router.push('/login')
  } catch {
    // 用户取消
  }
}

</script>

<style scoped>
/* 规划中菜单项 */
.nav-link.planned {
  color: rgba(255, 255, 255, 0.5) !important;
  cursor: not-allowed !important;
}
.nav-link.planned:hover {
  background-color: transparent !important;
}
.nav-link.planned .el-icon {
  color: rgba(255, 255, 255, 0.4);
}

/* 规划中标签 */
.nav-badge-soon {
  font-size: 10px;
  padding: 2px 6px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  margin-left: auto;
  color: rgba(255, 255, 255, 0.7);
}

/* Admin 专属标签 */
.nav-badge-admin {
  font-size: 10px;
  padding: 2px 6px;
  background: rgba(0, 163, 224, 0.3);
  border-radius: 10px;
  margin-left: auto;
  color: rgba(255, 255, 255, 0.8);
}
</style>
