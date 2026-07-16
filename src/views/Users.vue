<template>
  <div class="users-page">
    <!-- 统计卡片 -->
    <el-row :gutter="16" class="stat-row">
      <el-col :span="8">
        <el-card shadow="never" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon purple"><el-icon :size="22"><UserFilled /></el-icon></div>
            <div class="stat-info">
              <div class="stat-label">系统管理员</div>
              <div class="stat-value">{{ stats.admin }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon blue"><el-icon :size="22"><UserIcon /></el-icon></div>
            <div class="stat-info">
              <div class="stat-label">工程师</div>
              <div class="stat-value">{{ stats.engineer }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="never" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon green"><el-icon :size="22"><House /></el-icon></div>
            <div class="stat-info">
              <div class="stat-label">仓管员</div>
              <div class="stat-value">{{ stats.keeper }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 工具栏 -->
    <el-card shadow="never">
      <div class="toolbar">
        <div class="toolbar-left">
          <el-input v-model="keyword" placeholder="搜索 GID / 姓名 / 邮箱 / 部门" clearable class="search-input" @input="onSearch" @clear="loadData" />
          <el-select v-model="roleFilter" placeholder="全部角色" clearable class="role-select" @change="loadData">
            <el-option label="管理员" value="admin" />
            <el-option label="工程师" value="engineer" />
            <el-option label="仓管员" value="keeper" />
          </el-select>
        </div>
        <div class="toolbar-right">
          <el-button @click="exportTemplate"><el-icon><Download /></el-icon> 导出模板</el-button>
          <el-button @click="exportUsers"><el-icon><DocumentCopy /></el-icon> 导出用户</el-button>
          <el-button type="warning" @click="importDialogVisible = true"><el-icon><Upload /></el-icon> 批量导入</el-button>
          <el-button type="primary" @click="openAddDialog"><el-icon><Plus /></el-icon> 新增用户</el-button>
        </div>
      </div>

      <!-- 用户表格 -->
      <el-table :data="pageData" stripe border size="small" v-loading="loading" class="data-table">
        <el-table-column type="index" label="序号" width="60" align="center" :index="(i: number) => (currentPage - 1) * pageSize + i + 1" />
        <el-table-column prop="gid" label="GID" min-width="100">
          <template #default="{ row }"><span class="gid-text">{{ row.gid }}</span></template>
        </el-table-column>
        <el-table-column prop="name" label="姓名" min-width="100">
          <template #default="{ row }">
            {{ row.name }}
            <el-tag v-if="row.id === currentUserId" size="small" type="info" class="current-tag">当前</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="email" label="邮箱" min-width="160" show-overflow-tooltip />
        <el-table-column prop="department" label="部门" min-width="90" />
        <el-table-column prop="role" label="角色" min-width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="roleTagType(row.role)" size="small">{{ roleLabel(row.role) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" align="center" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openEditDialog(row)"><el-icon><Edit /></el-icon> 编辑</el-button>
            <el-button size="small" type="danger" :disabled="row.id === currentUserId" @click="confirmDelete(row)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-bar">
        <span class="record-count">共 {{ filteredList.length }} 条记录</span>
        <el-pagination v-model:current-page="currentPage" :page-size="pageSize" :total="filteredList.length" layout="prev, pager, next" />
      </div>
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="formDialogVisible" :title="isEdit ? '编辑用户' : '新增用户'" width="520px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="70px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="GID" prop="gid">
              <el-input v-model="form.gid" placeholder="如：G00006（登录账号）" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="姓名" prop="name">
              <el-input v-model="form.name" placeholder="请输入姓名" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="密码" prop="password">
              <el-input v-model="form.password" type="password" show-password
                :placeholder="isEdit ? '留空则不修改密码' : '至少 6 位'" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="邮箱" prop="email">
              <el-input v-model="form.email" placeholder="如：name@jci.com" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="部门" prop="department">
              <el-input v-model="form.department" placeholder="如：仓储部 / 研发部" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="角色" prop="role">
              <el-select v-model="form.role" placeholder="请选择角色" :disabled="isEditingSelf" class="full-width">
                <el-option label="管理员（admin）" value="admin" />
                <el-option label="工程师（engineer）" value="engineer" />
                <el-option label="仓管员（keeper）" value="keeper" />
              </el-select>
              <div v-if="isEditingSelf" class="field-hint">
                不可修改自身角色，避免管理员自降权
              </div>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="formDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">{{ isEdit ? '保存修改' : '新增用户' }}</el-button>
      </template>
    </el-dialog>

    <!-- 批量导入弹窗 -->
    <el-dialog v-model="importDialogVisible" title="批量导入用户" width="700px" destroy-on-close @close="resetImport">
      <!-- 模板下载 -->
      <div class="template-box">
        <el-icon :size="28" color="#217346"><Document /></el-icon>
        <div class="template-box-info">
          <div class="template-title">用户导入模板</div>
          <div class="template-desc">下载模板，按要求填写后上传</div>
        </div>
        <el-button @click="exportTemplate"><el-icon><Download /></el-icon> 下载模板</el-button>
      </div>
      <!-- 文件上传 -->
      <el-upload ref="uploadRef" drag :auto-upload="false" :limit="1" accept=".xlsx,.xls,.csv" :on-change="handleFileChange" :on-exceed="() => ElMessage.warning('只能上传一个文件')">
        <el-icon :size="36" color="var(--el-color-primary)"><UploadFilled /></el-icon>
        <div class="upload-hint">点击或拖拽文件到此处，支持 .xlsx / .xls / .csv</div>
      </el-upload>
      <!-- 预览 -->
      <div v-if="importPreview.length > 0" class="preview-block">
        <div class="preview-header">
          <span class="preview-title">导入预览</span>
          <span>
            <span class="text-success">有效 {{ importPreview.filter(r => r.valid).length }}</span>
            &nbsp;
            <span class="text-danger">错误 {{ importPreview.filter(r => !r.valid).length }}</span>
          </span>
        </div>
        <el-table :data="importPreview" border size="small" max-height="260">
          <el-table-column prop="row" label="行号" width="60" align="center" />
          <el-table-column prop="gid" label="GID" min-width="90" />
          <el-table-column prop="name" label="姓名" min-width="80" />
          <el-table-column prop="email" label="邮箱" min-width="140" show-overflow-tooltip />
          <el-table-column prop="department" label="部门" min-width="80" />
          <el-table-column prop="roleLabel" label="角色" min-width="70" />
          <el-table-column label="状态" width="110">
            <template #default="{ row }">
              <span v-if="row.valid" class="text-success">有效</span>
              <span v-else class="text-danger">{{ row.error }}</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <template #footer>
        <el-button @click="importDialogVisible = false">取消</el-button>
        <el-button type="primary" :disabled="importValidCount === 0" :loading="importing" @click="handleBatchImport">
          确认导入（{{ importValidCount }}）
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type UploadFile } from 'element-plus'
import { UserFilled, User as UserIcon, House, Download, DocumentCopy, Upload, Plus, Edit, Delete, Document, UploadFilled } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import type { UserPublic, User } from '@/types'
import { getUsers, createUser, updateUser, deleteUser, batchCreateUsers } from '@/api/users.api'
import { exportToExcel } from '@/utils/export'
import * as XLSX from 'xlsx'

const auth = useAuthStore()
const currentUserId = computed(() => auth.user?.id ?? -1)

// ==================== 常量 ====================
const ROLE_MAP: Record<string, string> = { admin: '管理员', engineer: '工程师', keeper: '仓管员' }
const ROLE_CN_TO_EN: Record<string, string> = { '管理员': 'admin', '工程师': 'engineer', '仓管员': 'keeper' }
const ROLE_TAG: Record<string, 'primary' | 'success' | 'warning'> = { admin: 'warning', engineer: 'primary', keeper: 'success' }
const roleLabel = (r: string) => ROLE_MAP[r] || r
const roleTagType = (r: string) => ROLE_TAG[r] || ''

// ==================== 列表状态 ====================
const loading = ref(false)
const allUsers = ref<UserPublic[]>([])
const keyword = ref('')
const roleFilter = ref('')
const currentPage = ref(1)
const pageSize = 10

const filteredList = computed(() => {
  let list = allUsers.value
  const kw = keyword.value.trim().toLowerCase()
  if (kw) {
    list = list.filter(u =>
      u.gid.toLowerCase().includes(kw) ||
      u.name.toLowerCase().includes(kw) ||
      u.email.toLowerCase().includes(kw) ||
      u.department.toLowerCase().includes(kw)
    )
  }
  if (roleFilter.value) list = list.filter(u => u.role === roleFilter.value)
  return list
})

const pageData = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredList.value.slice(start, start + pageSize)
})

const stats = computed(() => ({
  admin: allUsers.value.filter(u => u.role === 'admin').length,
  engineer: allUsers.value.filter(u => u.role === 'engineer').length,
  keeper: allUsers.value.filter(u => u.role === 'keeper').length,
}))

let searchTimer: ReturnType<typeof setTimeout> | null = null
function onSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { currentPage.value = 1 }, 300)
}

async function loadData() {
  loading.value = true
  try {
    const res = await getUsers()
    allUsers.value = res.data.list || []
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

// ==================== 新增/编辑弹窗 ====================
const formDialogVisible = ref(false)
const isEdit = ref(false)
const editingId = ref<number | null>(null)
const isEditingSelf = computed(() => isEdit.value && editingId.value === currentUserId.value)
const submitting = ref(false)
const formRef = ref<FormInstance>()

const form = reactive({
  gid: '', name: '', password: '', email: '', department: '', role: '' as string,
})

const formRules = computed(() => ({
  gid: [{ required: true, message: 'GID 不能为空', trigger: 'blur' }],
  name: [{ required: true, message: '姓名不能为空', trigger: 'blur' }],
  password: isEdit.value
    ? []
    : [
        { required: true, message: '密码不能为空', trigger: 'blur' },
        { min: 6, message: '密码至少 6 位', trigger: 'blur' },
      ],
  email: [
    { required: true, message: '邮箱不能为空', trigger: 'blur' },
    { type: 'email' as const, message: '邮箱格式不正确', trigger: 'blur' },
  ],
  department: [{ required: true, message: '部门不能为空', trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
}))

function resetForm() {
  form.gid = ''; form.name = ''; form.password = ''; form.email = ''; form.department = ''; form.role = ''
  editingId.value = null
  isEdit.value = false
}

function openAddDialog() {
  resetForm()
  formDialogVisible.value = true
}

function openEditDialog(row: any) {
  resetForm()
  isEdit.value = true
  editingId.value = row.id
  form.gid = row.gid
  form.name = row.name
  form.email = row.email
  form.department = row.department
  form.role = row.role
  formDialogVisible.value = true
}

async function handleSubmit() {
  if (!formRef.value) return
  await formRef.value.validate()
  submitting.value = true
  try {
    if (isEdit.value && editingId.value !== null) {
      const data: Partial<User> = { gid: form.gid, name: form.name, email: form.email, department: form.department, role: form.role as User['role'] }
      if (form.password) data.password = form.password
      const res = await updateUser(editingId.value, data)
      if (res.code === 200) { ElMessage.success(`用户「${form.name}」已更新`); formDialogVisible.value = false; loadData() }
      else ElMessage.error(res.message)
    } else {
      const res = await createUser({ gid: form.gid, name: form.name, password: form.password, email: form.email, department: form.department, role: form.role as User['role'] })
      if (res.code === 200) { ElMessage.success(`用户「${form.name}」新增成功`); formDialogVisible.value = false; loadData() }
      else ElMessage.error(res.message)
    }
  } catch (e) {
    ElMessage.error('操作失败')
  } finally {
    submitting.value = false
  }
}

async function confirmDelete(row: any) {
  if (row.id === currentUserId.value) { ElMessage.error('无法删除当前登录账户'); return }
  await ElMessageBox.confirm(`确定删除用户「${row.name}（${row.gid}）」？删除后无法恢复。`, '确认删除', { type: 'warning' })
  const res = await deleteUser(row.id)
  if (res.code === 200) { ElMessage.success(`用户「${row.name}」已删除`); loadData() }
  else ElMessage.error(res.message)
}

// ==================== Excel 导出 ====================
function exportTemplate() {
  const headers = ['GID', '姓名', '密码', '邮箱', '部门', '角色']
  const sample = [['G00099', '张三', '123456', 'zhangsan@jci.com', '研发部', '工程师']]
  exportToExcel('用户导入模板', headers, sample, '导入模板')
  ElMessage.success('模板已下载')
}

function exportUsers() {
  if (filteredList.value.length === 0) { ElMessage.error('暂无用户数据可导出'); return }
  const headers = ['GID', '姓名', '邮箱', '部门', '角色']
  const rows = filteredList.value.map(u => [u.gid, u.name, u.email, u.department, ROLE_MAP[u.role] || u.role] as (string | number)[])
  const date = new Date().toISOString().slice(0, 10)
  exportToExcel(`用户数据导出-${date}`, headers, rows, '用户数据')
  ElMessage.success(`已导出 ${rows.length} 条用户数据`)
}

// ==================== 批量导入 ====================
const importDialogVisible = ref(false)
const uploadRef = ref()
const importing = ref(false)

interface ImportRow { row: number; gid: string; name: string; password: string; email: string; department: string; role: string; roleLabel: string; valid: boolean; error: string }
const importPreview = ref<ImportRow[]>([])
const importValidCount = computed(() => importPreview.value.filter(r => r.valid).length)

function handleFileChange(file: UploadFile) {
  if (!file.raw) return
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (!['xlsx', 'xls', 'csv'].includes(ext || '')) { ElMessage.error('请上传 Excel 格式文件'); return }
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const wb = XLSX.read(new Uint8Array(e.target!.result as ArrayBuffer), { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' })
      parseImportRows(rows)
    } catch { ElMessage.error('文件解析失败') }
  }
  reader.readAsArrayBuffer(file.raw)
}

function parseImportRows(rows: string[][]) {
  const existingGids = new Set(allUsers.value.map(u => u.gid.toLowerCase()))
  const existingEmails = new Set(allUsers.value.map(u => u.email.toLowerCase()))
  const seenGids = new Map<string, boolean>()
  const seenEmails = new Map<string, boolean>()
  const result: ImportRow[] = []

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    if (r.every(c => String(c).trim() === '')) continue
    const gid = String(r[0] || '').trim()
    const name = String(r[1] || '').trim()
    const password = String(r[2] || '').trim()
    const email = String(r[3] || '').trim()
    const department = String(r[4] || '').trim()
    const roleRaw = String(r[5] || '').trim()
    const role = ROLE_CN_TO_EN[roleRaw] || (['admin', 'engineer', 'keeper'].includes(roleRaw.toLowerCase()) ? roleRaw.toLowerCase() : '')

    let error = ''
    if (!gid) error = '缺少GID'
    else if (existingGids.has(gid.toLowerCase())) error = 'GID已存在'
    else if (seenGids.has(gid.toLowerCase())) error = 'GID重复'
    if (!error && !name) error = '缺少姓名'
    if (!error && !password) error = '缺少密码'
    else if (!error && password.length < 6) error = '密码不足6位'
    if (!error && !email) error = '缺少邮箱'
    else if (!error && existingEmails.has(email.toLowerCase())) error = '邮箱已存在'
    else if (!error && seenEmails.has(email.toLowerCase())) error = '邮箱重复'
    if (!error && !department) error = '缺少部门'
    if (!error && !role) error = '角色无效'

    if (!error) { seenGids.set(gid.toLowerCase(), true); seenEmails.set(email.toLowerCase(), true) }
    result.push({ row: i + 1, gid, name, password, email, department, role, roleLabel: roleRaw, valid: !error, error })
  }
  importPreview.value = result
}

async function handleBatchImport() {
  const valid = importPreview.value.filter(r => r.valid)
  if (valid.length === 0) return
  importing.value = true
  try {
    const users = valid.map(r => ({ gid: r.gid, name: r.name, password: r.password, email: r.email, department: r.department, role: r.role as User['role'] }))
    const res = await batchCreateUsers(users)
    if (res.code === 200) {
      ElMessage.success(res.message)
      importDialogVisible.value = false
      loadData()
    } else ElMessage.error(res.message)
  } catch { ElMessage.error('导入失败') }
  finally { importing.value = false }
}

function resetImport() {
  importPreview.value = []
  if (uploadRef.value) uploadRef.value.clearFiles()
}

onMounted(() => { loadData() })
</script>

<style scoped>
.stat-card { cursor: default; }
.stat-content { display: flex; align-items: center; gap: 14px; }
.stat-icon {
  width: 48px; height: 48px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
}
.stat-icon.purple { background: #f3e8ff; color: #7c3aed; }
.stat-icon.blue   { background: #e0f2fe; color: #0284c7; }
.stat-icon.green  { background: #dcfce7; color: #16a34a; }
.stat-info { display: flex; flex-direction: column; }
.stat-label { font-size: 13px; color: var(--el-text-color-secondary); }
.stat-value { font-size: 26px; font-weight: 700; color: var(--el-text-color-primary); }
.toolbar { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
.toolbar-left { display: flex; gap: 12px; }
.toolbar-right { display: flex; gap: 8px; flex-wrap: wrap; }
.pagination-bar { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; }
.stat-row { margin-bottom: 16px; }
.search-input { width: 240px; }
.role-select { width: 140px; }
.data-table { width: 100%; margin-top: 16px; }
.gid-text { font-family: monospace; letter-spacing: 1px; }
.current-tag { margin-left: 4px; }
.record-count { color: var(--el-text-color-secondary); font-size: 13px; }
.full-width { width: 100%; }
.field-hint { font-size: 12px; color: var(--el-text-color-secondary); margin-top: 4px; }
.template-box { display: flex; align-items: center; gap: 12px; padding: 14px; background: var(--el-fill-color-light); border-radius: 8px; margin-bottom: 16px; }
.template-box-info { flex: 1; }
.template-title { font-weight: 600; }
.template-desc { font-size: 12px; color: var(--el-text-color-secondary); }
.upload-hint { margin-top: 8px; }
.preview-block { margin-top: 16px; }
.preview-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
.preview-title { font-weight: 600; }
.text-success { color: var(--el-color-success); }
.text-danger { color: var(--el-color-danger); }
</style>
