/**
 * 按钮级权限指令 v-permission
 *
 * 用法：
 *   <el-button v-permission="['admin']">仅管理员可见</el-button>
 *   <el-button v-permission="['admin', 'keeper']">管理员/仓管可见</el-button>
 *
 * 规则：当前登录用户角色不在传入数组中时，元素将从 DOM 移除。
 * 注意：前端仅做 UI 隐藏，后端 API 必须独立做角色校验（参考《隐性规则检查清单》）。
 */
import type { Directive, DirectiveBinding } from 'vue'
import { useAuthStore } from '@/stores/auth'

function checkPermission(el: HTMLElement, binding: DirectiveBinding<string[]>) {
  const { value } = binding

  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`v-permission 需要传入角色数组，如 v-permission="['admin']"`)
  }

  const role = useAuthStore().userRole
  const hasPermission = value.includes(role)

  if (!hasPermission) {
    el.parentNode?.removeChild(el)
  }
}

export const permission: Directive<HTMLElement, string[]> = {
  mounted(el, binding) {
    checkPermission(el, binding)
  },
}
