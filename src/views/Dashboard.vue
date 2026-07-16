<template>
  <div>
    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stat-row">
      <el-col :xs="24" :sm="12" :md="6" v-for="stat in stats" :key="stat.label">
        <div class="stat-card" :class="stat.color">
          <div class="stat-icon" :class="stat.color">
            <el-icon :size="28"><component :is="stat.icon" /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-label">{{ stat.label }}</div>
            <div class="stat-value">{{ stat.value }}</div>
            <div class="stat-trend">{{ stat.trend }}</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 快捷入口 -->
    <el-row :gutter="16" class="quick-row">
      <el-col :xs="12" :sm="8" :md="4" v-for="action in quickActions" :key="action.label">
        <router-link :to="action.to" class="quick-action">
          <div class="quick-icon" :class="action.color">
            <el-icon :size="24"><component :is="action.icon" /></el-icon>
          </div>
          <div class="quick-label">{{ action.label }}</div>
        </router-link>
      </el-col>
    </el-row>

    <!-- 两栏：待办 + 活动 -->
    <el-row :gutter="20">
      <el-col :xs="24" :md="16">
        <el-card shadow="hover" class="todo-card">
          <template #header>
            <div class="card-header">
              <span><el-icon><List /></el-icon> 待办事项</span>
            </div>
          </template>
          <div v-if="todos.length === 0" class="empty-todo">
            <el-icon :size="48" color="var(--jc-text-muted)"><CircleCheck /></el-icon>
            <p>暂无待办事项</p>
          </div>
          <ul v-else class="todo-list">
            <li v-for="todo in todos" :key="todo.id" class="todo-item" @click="goToTodo(todo.route)" style="cursor:pointer">
              <div class="todo-icon" :class="todo.type">
                <el-icon :size="18"><component :is="todo.icon" /></el-icon>
              </div>
              <div class="todo-content">
                <div class="todo-title">{{ todo.title }}</div>
                <div class="todo-meta">{{ todo.meta }}</div>
              </div>
              <el-tag :type="todo.badgeType" size="small">{{ todo.badge }}</el-tag>
            </li>
          </ul>
        </el-card>
      </el-col>
      <el-col :xs="24" :md="8">
        <el-card shadow="hover" class="activity-card">
          <template #header>
            <div class="card-header">
              <span><el-icon><Clock /></el-icon> 最近活动</span>
            </div>
          </template>
          <el-timeline>
            <el-timeline-item
              v-for="act in activities"
              :key="act.id"
              :type="act.dotType"
              :timestamp="act.time"
              placement="top"
            >
              {{ act.text }}
            </el-timeline-item>
          </el-timeline>
          <div v-if="activities.length === 0" class="empty-activity">
            暂无活动记录
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getInventoryStats } from '@/api/inventory.api'
import { getPendingFlows, getAllFlows } from '@/api/flows.api'

const router = useRouter()

// 统计数据（后续从 API 获取）
const stats = ref([
  { label: '库存总量', value: '0', trend: '实时统计', icon: 'Box', color: 'blue' },
  { label: '待办事项', value: '0', trend: '需要处理', icon: 'Clock', color: 'orange' },
  { label: '本月入库', value: '0', trend: '实时统计', icon: 'CircleCheck', color: 'green' },
  { label: '呆滞预警', value: '0', trend: '需要关注', icon: 'Warning', color: 'purple' },
])

// 快捷入口
const quickActions = [
  { label: '入库登记', icon: 'Plus', color: 'primary', to: '/inbound' },
  { label: '出库申请', icon: 'Minus', color: 'success', to: '/outbound' },
  { label: '移库操作', icon: 'Sort', color: 'warning', to: '/transfer' },
  { label: '库存查询', icon: 'Search', color: 'info', to: '/query' },
  { label: '快递发运', icon: 'Van', color: 'purple', to: '/express' },
  { label: '报废处理', icon: 'Delete', color: 'danger', to: '/scrap' },
]

// 待办事项
type BadgeType = 'primary' | 'success' | 'warning' | 'info' | 'danger'
const todos = ref<{ id: number; type: string; icon: string; title: string; meta: string; badge: string; badgeType: BadgeType; route: string }[]>([])

function goToTodo(route: string) {
  router.push(route)
}

// 最近活动
type DotType = '' | 'primary' | 'success' | 'warning' | 'info' | 'danger'
const activities = ref<{ id: number; text: string; time: string; dotType: DotType }[]>([])

function formatTime(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getMonth() + 1}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

async function loadData() {
  try {
    const [statsRes, pendingRes, allRes] = await Promise.all([
      getInventoryStats().catch(() => null),
      getPendingFlows().catch(() => null),
      getAllFlows().catch(() => null)
    ])
    
    // 更新卡片
    if (statsRes?.code === 200) {
      stats.value[0].value = String(statsRes.data.totalStock)
      stats.value[2].value = String(statsRes.data.monthlyInbound)
      stats.value[3].value = String(statsRes.data.dormantAlert)
    }
    
    // 更新待办
    if (pendingRes?.code === 200) {
      const pendingList = pendingRes.data.list
      stats.value[1].value = String(pendingList.length)
      
      todos.value = pendingList.map(f => {
        let icon = 'Document'
        let typeClass = 'inbound'
        let title = '审批任务'
        let route = '/'
        if (f.type === 'inbound_engineer') {
           icon = 'Plus'
           typeClass = 'inbound'
           title = '入库审批 - ' + (f.data.materialName || '未知物料')
           route = '/inbound'
        } else if (f.type === 'express_apply') {
           icon = 'Van'
           typeClass = 'transfer'
           title = '发运审批 - ' + (f.data.recipientName || '未知收件人')
           route = '/express'
        } else if (f.type === 'scrap_apply') {
           icon = 'Delete'
           typeClass = 'outbound'
           title = '报废审批 - ' + (f.data.materialName || '未知物料')
           route = '/scrap'
        }
        
        return {
          id: f.id,
          type: typeClass,
          icon,
          title,
          meta: `申请人: ${f.creator} | 当前环节: ${f.currentStep}`,
          badge: '待处理',
          badgeType: 'warning',
          route
        }
      })
    }
    
    // 更新活动
    if (allRes?.code === 200) {
       const actList = allRes.data.list
         .filter(f => f.status === 'completed' || f.status === 'rejected')
         .slice(0, 8)
         
       activities.value = actList.map(f => {
         const isCompleted = f.status === 'completed'
         let targetStr = '一条审批流'
         if (f.type === 'inbound_engineer') targetStr = '入库申请'
         else if (f.type === 'express_apply') targetStr = '发运单'
         else if (f.type === 'scrap_apply') targetStr = '报废申请'
         
         const text = isCompleted 
            ? `${f.creator} 的${targetStr}已完结` 
            : `${f.creator} 的${targetStr}被驳回`
         
         return {
           id: f.id,
           text,
           time: formatTime(f.approveTime || f.createTime),
           dotType: isCompleted ? 'success' : 'danger'
         }
       })
    }
    
  } catch (err) {
    ElMessage.error('获取工作台数据失败')
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.stat-row {
  margin-bottom: 20px;
}

.stat-card {
  background: var(--jc-card-white);
  border-radius: var(--jc-radius-card);
  box-shadow: var(--jc-shadow-card);
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  margin-bottom: 12px;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.stat-icon {
  width: 64px;
  height: 64px;
  border-radius: var(--jc-radius-card);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon.blue   { background: var(--jc-accent-teal-light); color: var(--jc-accent-teal); }
.stat-icon.orange { background: var(--jc-warning-orange-light); color: var(--jc-warning-orange); }
.stat-icon.green  { background: var(--jc-success-green-light); color: var(--jc-success-green); }
.stat-icon.purple { background: var(--jc-tag-purple-bg); color: var(--jc-tag-purple-text); }

.stat-label { font-size: 14px; color: var(--jc-text-light); margin-bottom: 4px; }
.stat-value { font-size: 32px; font-weight: 700; color: var(--jc-text-dark); line-height: 1.2; }
.stat-trend { font-size: 12px; margin-top: 4px; color: var(--jc-text-muted); }

/* 快捷入口 */
.quick-row {
  margin-bottom: 20px;
}

.quick-action {
  background: var(--jc-card-white);
  border-radius: var(--jc-radius-card);
  box-shadow: var(--jc-shadow-card);
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.15s ease;
  text-decoration: none;
  display: block;
  margin-bottom: 12px;
}

.quick-action:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.quick-icon {
  width: 56px;
  height: 56px;
  border-radius: var(--jc-radius-card);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 12px;
}

.quick-icon.primary { background: var(--jc-accent-teal-light); color: var(--jc-accent-teal); }
.quick-icon.success { background: var(--jc-success-green-light); color: var(--jc-success-green); }
.quick-icon.warning { background: var(--jc-warning-orange-light); color: var(--jc-warning-orange); }
.quick-icon.danger  { background: var(--jc-danger-red-light); color: var(--jc-danger-red); }
.quick-icon.purple  { background: var(--jc-tag-purple-bg); color: var(--jc-tag-purple-text); }
.quick-icon.info    { background: #E3F2FD; color: #1976D2; }

.quick-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--jc-text-dark);
}

/* 待办 */
.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--jc-text-dark);
}

.todo-card {
  margin-bottom: 20px;
}

.empty-todo {
  text-align: center;
  padding: 40px;
  color: var(--jc-text-muted);
}

.todo-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.todo-item {
  display: flex;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid var(--jc-border-line-light);
}

.todo-item:last-child {
  border-bottom: none;
}

.todo-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  flex-shrink: 0;
}

.todo-icon.inbound  { background: var(--jc-accent-teal-light); color: var(--jc-accent-teal); }
.todo-icon.outbound { background: var(--jc-success-green-light); color: var(--jc-success-green); }
.todo-icon.transfer { background: var(--jc-warning-orange-light); color: var(--jc-warning-orange); }

.todo-content {
  flex: 1;
  min-width: 0;
}

.todo-title {
  font-weight: 600;
  color: var(--jc-text-dark);
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.todo-meta {
  font-size: 12px;
  color: var(--jc-text-light);
}

.activity-card {
  margin-bottom: 20px;
}

.empty-activity {
  text-align: center;
  color: var(--jc-text-muted);
  padding: 20px;
}
</style>
