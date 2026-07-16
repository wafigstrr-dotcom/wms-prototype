<template>
  <div class="login-page">
    <div class="login-container">
      <!-- 左侧品牌区域 -->
      <div class="login-brand">
        <div class="login-brand-logo">
          <img :src="logoUrl" alt="Johnson Controls Logo" style="width: 100%; height: 100%; object-fit: cover;" />
        </div>
        <h1 class="login-brand-title">myPrototype</h1>
        <p class="login-brand-subtitle">仓储与样机试制管理系统</p>
        <div class="login-brand-features">
          <div class="login-brand-feature">
            <el-icon><Check /></el-icon>
            <span>智能化仓储管理</span>
          </div>
          <div class="login-brand-feature">
            <el-icon><Check /></el-icon>
            <span>全流程审批跟踪</span>
          </div>
          <div class="login-brand-feature">
            <el-icon><Check /></el-icon>
            <span>多维度数据查询</span>
          </div>
        </div>
      </div>

      <!-- 右侧表单区域 -->
      <div class="login-form-wrapper">
        <div class="login-form-header">
          <h2 class="login-form-title">欢迎登录</h2>
          <p class="login-form-subtitle">请使用您的 GID 和密码登录系统</p>
        </div>

        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          class="login-form"
          @submit.prevent="handleLogin"
        >
          <el-form-item prop="gid">
            <el-input
              v-model="form.gid"
              placeholder="请输入 GID"
              :prefix-icon="User"
              size="large"
            />
          </el-form-item>

          <el-form-item prop="password">
            <el-input
              v-model="form.password"
              type="password"
              placeholder="请输入密码"
              :prefix-icon="Lock"
              size="large"
              show-password
            />
          </el-form-item>

          <el-form-item>
            <el-button
              type="primary"
              size="large"
              class="login-btn"
              :loading="loading"
              native-type="submit"
            >
              登 录
            </el-button>
          </el-form-item>
        </el-form>

        <div class="login-footer">
          © 2026 Johnson Controls. All rights reserved.
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, type FormInstance } from 'element-plus'
import { User, Lock, Check } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import logoUrl from '@/assets/logo.webp'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const formRef = ref<FormInstance>()
const loading = ref(false)

const form = reactive({
  gid: '',
  password: '',
})

const rules = {
  gid: [{ required: true, message: '请输入 GID', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' },
  ],
}

async function handleLogin() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    const result = await authStore.login(form.gid, form.password)
    if (result.success) {
      ElMessage.success('登录成功')
      const redirect = (route.query.redirect as string) || '/'
      router.push(redirect)
    } else {
      ElMessage.error(result.message || '登录失败')
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--jc-primary-blue) 0%, #001a33 100%);
  padding: 20px;
}

.login-container {
  display: flex;
  width: 100%;
  max-width: 1000px;
  min-height: 560px;
  background: var(--jc-card-white);
  border-radius: var(--jc-radius-card);
  box-shadow: var(--jc-shadow-modal);
  overflow: hidden;
}

/* 左侧品牌区 */
.login-brand {
  flex: 1;
  background: linear-gradient(135deg, var(--jc-primary-blue) 0%, #004080 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 40px;
  color: #fff;
  text-align: center;
}

.login-brand-logo {
  width: 130px;
  height: 130px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 30px;
  border: 3px solid rgba(255, 255, 255, 0.3);
}

.login-brand-title {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 12px;
}

.login-brand-subtitle {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 40px;
}

.login-brand-features {
  display: flex;
  flex-direction: column;
  gap: 16px;
  text-align: left;
}

.login-brand-feature {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
}

/* 右侧表单 */
.login-form-wrapper {
  flex: 1;
  padding: 60px 50px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.login-form-header {
  text-align: center;
  margin-bottom: 40px;
}

.login-form-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--jc-text-dark);
  margin-bottom: 8px;
}

.login-form-subtitle {
  font-size: 14px;
  color: var(--jc-text-light);
}

.login-btn {
  width: 100%;
  font-size: 16px;
  font-weight: 600;
}

.login-footer {
  text-align: center;
  margin-top: 30px;
  font-size: 12px;
  color: var(--jc-text-muted);
}

@media (max-width: 768px) {
  .login-container {
    flex-direction: column;
    max-width: 400px;
  }
  .login-brand {
    padding: 40px 30px;
    min-height: auto;
  }
  .login-brand-features {
    display: none;
  }
  .login-form-wrapper {
    padding: 30px;
  }
}
</style>
