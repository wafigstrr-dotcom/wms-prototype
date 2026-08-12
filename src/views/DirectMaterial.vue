<template>
  <div class="direct-material-page">
    <!-- 统计卡片 -->
    <el-row :gutter="16" class="stat-row">
      <el-col :span="6"><el-card shadow="never" class="stat-card">
        <div class="stat-content"><div class="stat-icon blue"><el-icon :size="22"><Document /></el-icon></div>
        <div class="stat-info"><div class="stat-label">记录总数</div><div class="stat-value">{{ stats.total }}</div></div></div>
      </el-card></el-col>
      <el-col :span="6"><el-card shadow="never" class="stat-card">
        <div class="stat-content"><div class="stat-icon green"><el-icon :size="22"><Promotion /></el-icon></div>
        <div class="stat-info"><div class="stat-label">已发供方</div><div class="stat-value">{{ stats.sent }}</div></div></div>
      </el-card></el-col>
      <el-col :span="6"><el-card shadow="never" class="stat-card">
        <div class="stat-content"><div class="stat-icon orange"><el-icon :size="22"><Clock /></el-icon></div>
        <div class="stat-info"><div class="stat-label">未发供方</div><div class="stat-value">{{ stats.unsent }}</div></div></div>
      </el-card></el-col>
      <el-col :span="6"><el-card shadow="never" class="stat-card">
        <div class="stat-content"><div class="stat-icon purple"><el-icon :size="22"><Money /></el-icon></div>
        <div class="stat-info"><div class="stat-label">金额合计</div><div class="stat-value">{{ formatMoney(stats.amount) }}</div></div></div>
      </el-card></el-col>
    </el-row>

    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-input v-model="keyword" placeholder="搜索申请人、所属人、物料名称、项目编号、PR号、PO号、供应商..." clearable class="dm-search" @input="onSearch" @clear="loadList" />
        <el-select v-model="sentFilter" placeholder="发送供方" clearable class="dm-filter" @change="loadList">
          <el-option label="已发送" value="是" />
          <el-option label="未发送" value="否" />
        </el-select>
      </div>
      <div class="toolbar-right">
        <el-button @click="exportTemplate"><el-icon><Download /></el-icon> 导出模板</el-button>
        <el-button @click="exportData"><el-icon><Download /></el-icon> 批量导出</el-button>
        <ExcelImport :import-fn="handleImport" @success="loadList" />
        <el-button type="primary" @click="openAdd"><el-icon><Plus /></el-icon> 新增</el-button>
      </div>
    </div>

    <!-- 批量操作栏 -->
    <div v-if="selected.size > 0" class="batch-bar">
      <span class="selected-text">已选 <strong class="primary-strong">{{ selected.size }}</strong> 项</span>
      <el-button type="danger" size="small" v-permission="['admin']" @click="confirmBatchDelete"><el-icon><Delete /></el-icon> 批量删除</el-button>
    </div>

    <!-- 表格 -->
    <el-table :data="pageData" stripe border size="small" v-loading="loading" class="data-table" row-key="id" @selection-change="onSelectionChange" @expand-change="onExpandChange">
      <el-table-column type="expand">
        <template #default="{ row }">
          <div class="sub-item-panel">
            <div class="sub-toolbar">
              <span class="sub-title">子项明细（{{ (subCache[row.id] || []).length }}）</span>
            </div>
            <el-table :data="subCache[row.id] || []" v-loading="subLoading[row.id]" size="small" border class="sub-table">
              <el-table-column type="index" label="序号" width="60" align="center" />
              <el-table-column prop="sapDrawingNo" label="SAP号/图号" min-width="150">
                <template #default="{ row: sub }"><span class="code-text">{{ sub.sapDrawingNo }}</span></template>
              </el-table-column>
              <el-table-column prop="purchaseDescription" label="物料名称" min-width="220" show-overflow-tooltip />
              <el-table-column prop="quantity" label="数量" width="100" align="right" />
              <el-table-column label="操作" width="140" align="center">
                <template #default="{ row: sub }">
                  <el-button size="small" @click="openEditSub(row.id, sub)"><el-icon><Edit /></el-icon></el-button>
                  <el-button size="small" type="danger" v-permission="['admin']" @click="confirmDeleteSub(row.id, sub)"><el-icon><Delete /></el-icon></el-button>
                </template>
              </el-table-column>
              <template #empty>
                <div class="sub-empty-add" @click="openAddSub(row.id)">
                  <el-icon><Plus /></el-icon><span>暂无子项，点击添加第一个子项</span>
                </div>
              </template>
              <template #append>
                <div v-if="(subCache[row.id] || []).length" class="sub-add-row" @click="openAddSub(row.id)">
                  <el-icon><Plus /></el-icon><span>添加子项</span>
                </div>
              </template>
            </el-table>
          </div>
        </template>
      </el-table-column>
      <el-table-column type="selection" width="50" align="center" />
      <el-table-column type="index" label="序号" width="60" align="center" :index="(i: number) => (page - 1) * PAGE_SIZE + i + 1" />
      <el-table-column prop="orderDate" label="下单日期" min-width="110" />
      <el-table-column prop="applicant" label="申请人" min-width="90" />
      <el-table-column prop="owner" label="所属人" min-width="90" />
      <el-table-column prop="pbu" label="PBU" min-width="80" align="center" />
      <el-table-column prop="department" label="所属部门" min-width="110" />
      <el-table-column prop="projectCode" label="项目编号" min-width="120">
        <template #default="{ row }"><span class="code-text">{{ row.projectCode }}</span></template>
      </el-table-column>
      <el-table-column prop="sapDrawingNo" label="SAP号/图号" min-width="120">
        <template #default="{ row }"><span class="code-text">{{ row.sapDrawingNo }}</span></template>
      </el-table-column>
      <el-table-column prop="purchaseDescription" label="物料名称" min-width="160" show-overflow-tooltip />
      <el-table-column prop="prNo" label="PR号" min-width="120">
        <template #default="{ row }"><span class="code-text">{{ row.prNo }}</span></template>
      </el-table-column>
      <el-table-column prop="item" label="item号" min-width="100" />
      <el-table-column prop="purchaseGroup" label="采购组" min-width="90" />
      <el-table-column prop="quantity" label="数量" min-width="80" align="right" />
      <el-table-column prop="exempt3C" label="免3C" min-width="70" align="center" />
      <el-table-column prop="purchaseEngineer" label="采购工程师" min-width="100" />
      <el-table-column prop="supplierCode" label="供应商代码" min-width="100" />
      <el-table-column prop="supplierName" label="供应商名称" min-width="160" show-overflow-tooltip />
      <el-table-column prop="amount" label="金额" min-width="110" align="right">
        <template #default="{ row }">{{ formatMoney(row.amount) }}</template>
      </el-table-column>
      <el-table-column prop="poNo" label="PO号" min-width="120">
        <template #default="{ row }"><span class="code-text">{{ row.poNo }}</span></template>
      </el-table-column>
      <el-table-column prop="deliveryDate" label="交货日期" min-width="110" />
      <el-table-column prop="sentToSupplier" label="发送供方" min-width="90" align="center">
        <template #default="{ row }"><el-tag :type="row.sentToSupplier === '是' ? 'success' : 'info'" size="small">{{ row.sentToSupplier }}</el-tag></template>
      </el-table-column>
      <el-table-column prop="remark" label="备注" min-width="120" show-overflow-tooltip />
      <el-table-column label="子项" width="80" align="center">
        <template #default="{ row }">
          <el-tag :type="row.subItemCount ? 'primary' : 'info'" size="small" effect="plain">{{ row.subItemCount || 0 }} 项</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150" align="center" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="openEdit(row)"><el-icon><Edit /></el-icon> 编辑</el-button>
          <el-button size="small" type="danger" v-permission="['admin']" @click="confirmDelete(row)"><el-icon><Delete /></el-icon></el-button>
        </template>
      </el-table-column>
    </el-table>
    <div class="pagination-bar">
      <span class="record-count">共 {{ filtered.length }} 条记录</span>
      <el-pagination v-model:current-page="page" :page-size="PAGE_SIZE" :total="filtered.length" layout="prev,pager,next" />
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑直接物料' : '新增直接物料'" width="760px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="下单日期" prop="orderDate">
            <el-date-picker v-model="form.orderDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" class="full-width" />
          </el-form-item></el-col>
          <el-col :span="12"><el-form-item label="申请人" prop="applicant">
            <el-input v-model="form.applicant" placeholder="如：朱智国" />
          </el-form-item></el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="所属人" prop="owner">
            <el-input v-model="form.owner" placeholder="物料所属人" />
          </el-form-item></el-col>
          <el-col :span="12"><el-form-item label="所属部门" prop="department">
            <el-input v-model="form.department" placeholder="请输入所属部门" />
          </el-form-item></el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="项目编号" prop="projectCode">
            <el-input v-model="form.projectCode" placeholder="如：PRJ-2025-001" />
          </el-form-item></el-col>
          <el-col :span="12"><el-form-item label="PBU" prop="pbu">
            <el-select v-model="form.pbu" placeholder="请选择" clearable class="full-width">
              <el-option v-for="opt in PBU_OPTIONS" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </el-form-item></el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="采购工程师" prop="purchaseEngineer">
            <el-input v-model="form.purchaseEngineer" placeholder="如：范广武" />
          </el-form-item></el-col>
          <el-col :span="12"><el-form-item label="采购组" prop="purchaseGroup">
            <el-input v-model="form.purchaseGroup" placeholder="如：PG01" />
          </el-form-item></el-col>
        </el-row>
        <el-form-item label="SAP号/图号" prop="sapDrawingNo">
          <el-input v-model="form.sapDrawingNo" placeholder="如：SAP-100123 或图号" />
        </el-form-item>
        <el-form-item label="物料名称" prop="purchaseDescription">
          <el-input v-model="form.purchaseDescription" type="textarea" :rows="2" placeholder="请输入物料名称" />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="金额" prop="amount">
            <el-input-number v-model="form.amount" :min="0" :precision="2" :controls="false" class="full-width" />
          </el-form-item></el-col>
          <el-col :span="12"><el-form-item label="数量" prop="quantity">
            <el-input-number v-model="form.quantity" :min="0" :precision="0" :controls="false" class="full-width" />
          </el-form-item></el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="PR号" prop="prNo">
            <el-input v-model="form.prNo" placeholder="如：PR2025030001" />
          </el-form-item></el-col>
          <el-col :span="12"><el-form-item label="item号" prop="item">
            <el-input v-model="form.item" placeholder="物料编码" />
          </el-form-item></el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="供应商代码" prop="supplierCode">
            <el-input v-model="form.supplierCode" placeholder="如：S0012" />
          </el-form-item></el-col>
          <el-col :span="12"><el-form-item label="供应商名称" prop="supplierName">
            <el-input v-model="form.supplierName" placeholder="供应商名称" />
          </el-form-item></el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="PO号" prop="poNo">
            <el-input v-model="form.poNo" placeholder="如：PO2025030001" />
          </el-form-item></el-col>
          <el-col :span="12"><el-form-item label="交货日期" prop="deliveryDate">
            <el-date-picker v-model="form.deliveryDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" class="full-width" />
          </el-form-item></el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="免3C" prop="exempt3C">
            <el-select v-model="form.exempt3C" placeholder="请选择" clearable class="full-width">
              <el-option label="是" value="是" />
              <el-option label="否" value="否" />
            </el-select>
          </el-form-item></el-col>
          <el-col :span="12"><el-form-item label="发送供方" prop="sentToSupplier">
            <el-select v-model="form.sentToSupplier" class="full-width">
              <el-option label="是" value="是" />
              <el-option label="否" value="否" />
            </el-select>
          </el-form-item></el-col>
        </el-row>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="选填" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submit">{{ isEdit ? '保存修改' : '新增' }}</el-button>
      </template>
    </el-dialog>

    <!-- 子项 新增/编辑弹窗 -->
    <el-dialog v-model="subDialogVisible" :title="subIsEdit ? '编辑子项' : '新增子项'" width="520px" destroy-on-close>
      <el-form ref="subFormRef" :model="subForm" :rules="subRules" label-width="90px">
        <el-form-item label="SAP号/图号" prop="sapDrawingNo">
          <el-input v-model="subForm.sapDrawingNo" placeholder="如：SAP-100123-A 或图号（选填）" />
        </el-form-item>
        <el-form-item label="物料名称" prop="purchaseDescription">
          <el-input v-model="subForm.purchaseDescription" type="textarea" :rows="2" placeholder="请输入物料名称" />
        </el-form-item>
        <el-form-item label="数量" prop="quantity">
          <el-input-number v-model="subForm.quantity" :min="1" :precision="0" :controls="false" class="full-width" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="subDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="subSubmitting" @click="submitSub">{{ subIsEdit ? '保存修改' : '新增' }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Document, Promotion, Clock, Money, Download, Plus, Edit, Delete } from '@element-plus/icons-vue'
import type { DirectMaterial, DirectMaterialSubItem } from '@/types'
import ExcelImport from '@/components/common/ExcelImport.vue'
import {
  getDirectMaterials, createDirectMaterial, updateDirectMaterial,
  deleteDirectMaterial, batchDeleteDirectMaterials, importDirectMaterials,
  getSubItems, createSubItem, updateSubItem, deleteSubItem,
  type NewDirectMaterial, type NewSubItem,
} from '@/api/directMaterial.api'
import { exportSheets } from '@/utils/export'

const PAGE_SIZE = 10
const PBU_OPTIONS = ['AS', 'CS', 'IR', 'BMS', 'SS']
const formatMoney = (n: number) => `¥${(Number(n) || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// ==================== 列表 ====================
const loading = ref(false)
const list = ref<DirectMaterial[]>([])
const keyword = ref('')
const sentFilter = ref('')
const page = ref(1)
const selected = ref<Set<number>>(new Set())

const filtered = computed(() => list.value)
const pageData = computed(() => {
  const s = (page.value - 1) * PAGE_SIZE
  return filtered.value.slice(s, s + PAGE_SIZE)
})
const stats = computed(() => ({
  total: list.value.length,
  sent: list.value.filter(m => m.sentToSupplier === '是').length,
  unsent: list.value.filter(m => m.sentToSupplier === '否').length,
  amount: list.value.reduce((sum, m) => sum + (Number(m.amount) || 0), 0),
}))

let searchTimer: ReturnType<typeof setTimeout> | null = null
function onSearch() { if (searchTimer) clearTimeout(searchTimer); searchTimer = setTimeout(() => { page.value = 1; loadList() }, 300) }

async function loadList() {
  loading.value = true
  try {
    const res = await getDirectMaterials({ keyword: keyword.value || undefined, sentToSupplier: sentFilter.value || undefined })
    list.value = res.data.list || []
  } finally { loading.value = false }
}

function onSelectionChange(rows: DirectMaterial[]) {
  selected.value = new Set(rows.map(r => r.id))
}

// ==================== 弹窗 ====================
const dialogVisible = ref(false)
const isEdit = ref(false)
const editingId = ref<number | null>(null)
const submitting = ref(false)
const formRef = ref<FormInstance>()

function emptyForm(): NewDirectMaterial {
  return {
    orderDate: '', applicant: '', owner: '', pbu: '', department: '', projectCode: '',
    purchaseEngineer: '', sapDrawingNo: '', purchaseDescription: '',
    prNo: '', item: '', purchaseGroup: '', quantity: 0, exempt3C: '',
    supplierCode: '', supplierName: '', amount: 0, poNo: '', deliveryDate: '',
    sentToSupplier: '否', remark: '',
  }
}
const form = reactive<NewDirectMaterial>(emptyForm())

const deliveryValidator = (_r: unknown, value: string, cb: (e?: Error) => void) => {
  if (value && form.orderDate && value < form.orderDate) cb(new Error('交货日期不能早于下单日期'))
  else cb()
}
const rules: FormRules = {
  orderDate: [{ required: true, message: '请选择下单日期', trigger: 'change' }],
  applicant: [{ required: true, message: '申请人不能为空', trigger: 'blur' }],
  purchaseEngineer: [{ required: true, message: '采购工程师不能为空', trigger: 'blur' }],
  purchaseDescription: [{ required: true, message: '物料名称不能为空', trigger: 'blur' }],
  amount: [{ required: true, message: '请输入金额', trigger: 'blur' }],
  quantity: [{ required: true, message: '请输入数量', trigger: 'blur' }],
  deliveryDate: [{ validator: deliveryValidator, trigger: 'change' }],
  sentToSupplier: [{ required: true, message: '请选择发送供方', trigger: 'change' }],
}

function resetForm() { Object.assign(form, emptyForm()); editingId.value = null; isEdit.value = false }
function openAdd() { resetForm(); dialogVisible.value = true }
function openEdit(row: any) {
  resetForm(); isEdit.value = true; editingId.value = row.id
  Object.assign(form, {
    orderDate: row.orderDate, applicant: row.applicant, owner: row.owner ?? '', pbu: row.pbu ?? '',
    department: row.department ?? '', projectCode: row.projectCode ?? '', purchaseEngineer: row.purchaseEngineer,
    sapDrawingNo: row.sapDrawingNo, purchaseDescription: row.purchaseDescription,
    prNo: row.prNo, item: row.item, purchaseGroup: row.purchaseGroup, quantity: row.quantity,
    exempt3C: row.exempt3C ?? '', supplierCode: row.supplierCode, supplierName: row.supplierName,
    amount: row.amount, poNo: row.poNo, deliveryDate: row.deliveryDate,
    sentToSupplier: row.sentToSupplier, remark: row.remark,
  })
  dialogVisible.value = true
}

async function submit() {
  if (!formRef.value) return
  await formRef.value.validate()
  submitting.value = true
  try {
    const payload = { ...form }
    if (isEdit.value && editingId.value !== null) {
      const res = await updateDirectMaterial(editingId.value, payload)
      if (res.code === 200) { ElMessage.success('已更新'); dialogVisible.value = false; loadList() }
    } else {
      const res = await createDirectMaterial(payload)
      if (res.code === 200) { ElMessage.success('新增成功'); dialogVisible.value = false; loadList() }
    }
  } catch (e) {
    // 业务错误（如 PO号重复）已由响应拦截器提示
  } finally { submitting.value = false }
}

async function confirmDelete(row: any) {
  await ElMessageBox.confirm(`确定删除该记录（申请人：${row.applicant}）？`, '确认删除', { type: 'warning' })
  const res = await deleteDirectMaterial(row.id)
  if (res.code === 200) { ElMessage.success('已删除'); loadList() }
}

async function confirmBatchDelete() {
  const ids = Array.from(selected.value)
  await ElMessageBox.confirm(`确定删除选中的 ${ids.length} 条记录？`, '确认删除', { type: 'warning' })
  const res = await batchDeleteDirectMaterials(ids)
  if (res.code === 200) { ElMessage.success(res.message); selected.value.clear(); loadList() }
}

// ==================== 子项（BOM 明细）====================
const subCache = reactive<Record<number, DirectMaterialSubItem[]>>({})
const subLoading = reactive<Record<number, boolean>>({})

async function onExpandChange(row: any, expanded: any) {
  // expanded 为当前展开行数组（Element Plus 传入）；仅在展开且未缓存时加载
  const isExpanded = Array.isArray(expanded) ? expanded.some((r: any) => r.id === row.id) : !!expanded
  if (isExpanded && !subCache[row.id]) await loadSubItems(row.id)
}

async function loadSubItems(parentId: number) {
  subLoading[parentId] = true
  try {
    const res = await getSubItems(parentId)
    subCache[parentId] = res.data || []
    syncCount(parentId)
  } finally { subLoading[parentId] = false }
}

// 同步父行的子项计数（避免整表重载）
function syncCount(parentId: number) {
  const target = list.value.find(m => m.id === parentId)
  if (target) target.subItemCount = (subCache[parentId] || []).length
}

const subDialogVisible = ref(false)
const subIsEdit = ref(false)
const subParentId = ref<number>(0)
const subEditingId = ref<number | null>(null)
const subSubmitting = ref(false)
const subFormRef = ref<FormInstance>()

function emptySubForm(): NewSubItem {
  return { sapDrawingNo: '', purchaseDescription: '', quantity: 1 }
}
const subForm = reactive<NewSubItem>(emptySubForm())
const subRules: FormRules = {
  purchaseDescription: [{ required: true, message: '物料名称不能为空', trigger: 'blur' }],
  quantity: [{ required: true, message: '请输入数量（≥1）', trigger: 'blur' }],
}

function resetSubForm() { Object.assign(subForm, emptySubForm()); subEditingId.value = null; subIsEdit.value = false }
function openAddSub(parentId: number) { resetSubForm(); subParentId.value = parentId; subDialogVisible.value = true }
function openEditSub(parentId: number, sub: any) {
  resetSubForm(); subIsEdit.value = true; subParentId.value = parentId; subEditingId.value = sub.id
  Object.assign(subForm, { sapDrawingNo: sub.sapDrawingNo, purchaseDescription: sub.purchaseDescription, quantity: sub.quantity })
  subDialogVisible.value = true
}

async function submitSub() {
  if (!subFormRef.value) return
  await subFormRef.value.validate()
  subSubmitting.value = true
  try {
    const pid = subParentId.value
    if (subIsEdit.value && subEditingId.value !== null) {
      const res = await updateSubItem(pid, subEditingId.value, { ...subForm })
      if (res.code === 200) { ElMessage.success('已更新'); subDialogVisible.value = false; await loadSubItems(pid) }
    } else {
      const res = await createSubItem(pid, { ...subForm })
      if (res.code === 200) { ElMessage.success('新增成功'); subDialogVisible.value = false; await loadSubItems(pid) }
    }
  } catch {
    // 业务错误已由响应拦截器提示
  } finally { subSubmitting.value = false }
}

async function confirmDeleteSub(parentId: number, sub: any) {
  await ElMessageBox.confirm(`确定删除该子项（${sub.purchaseDescription}）？`, '确认删除', { type: 'warning' })
  const res = await deleteSubItem(parentId, sub.id)
  if (res.code === 200) { ElMessage.success('已删除'); await loadSubItems(parentId) }
}

// ==================== 导入 / 导出 ====================
function handleImport(rows: Record<string, unknown>[]) {
  return importDirectMaterials(rows)
}

async function exportData() {
  if (!list.value.length) { ElMessage.error('暂无数据可导出'); return }
  const headers = ['主记录序号', '下单日期', '申请人', '所属人', 'PBU', '所属部门', '项目编号', 'SAP 号/图号', '物料名称', 'PR 号', 'item 号', '采购组', '数量', '免 3C', '采购工程师', '供应商代码', '供应商名称', '金额', 'PO 号', '交货日期', '发送供方', '备注']
  const rows = list.value.map((m, i) => [
    i + 1, m.orderDate, m.applicant, m.owner, m.pbu, m.department, m.projectCode, m.sapDrawingNo,
    m.purchaseDescription, m.prNo, m.item, m.purchaseGroup, m.quantity, m.exempt3C, m.purchaseEngineer,
    m.supplierCode, m.supplierName, m.amount, m.poNo, m.deliveryDate, m.sentToSupplier, m.remark,
  ] as (string | number)[])

  // 子项明细 Sheet：以「主记录序号」作为关联键
  const subHeaders = ['主记录序号', 'SAP 号/图号', '物料名称', '数量']
  const subRows: (string | number)[][] = []
  const results = await Promise.all(list.value.map(m => getSubItems(m.id)))
  list.value.forEach((_m, i) => {
    for (const sub of results[i].data || []) {
      subRows.push([i + 1, sub.sapDrawingNo, sub.purchaseDescription, sub.quantity])
    }
  })

  const today = new Date().toISOString().slice(0, 10)
  exportSheets(`直接物料数据导出-${today}`, [
    { name: '主记录', headers, rows },
    { name: '子项明细', headers: subHeaders, rows: subRows },
  ])
  ElMessage.success(`已导出 ${rows.length} 条主记录、${subRows.length} 条子项`)
}

// ==================== 导出导入模板 ====================
function exportTemplate() {
  // 导入模板：不包含主记录序号（系统自动生成），仅包含业务字段
  const headers = ['PO 号', '下单日期', '申请人', '所属人', 'PBU', '所属部门', '项目编号', 'SAP 号/图号', '物料名称', 'PR 号', 'item 号', '采购组', '数量', '免 3C', '采购工程师', '供应商代码', '供应商名称', '金额', '交货日期', '发送供方', '备注']
  const exampleRows: (string | number)[][] = [
    [
      'PO2025031001', '2025-03-06', '朱智国', '张三', 'IR', '研发部', 'PRJ-2025-010', 
      'SAP-100123', '控制箱线束 - 示例', 'PR2025030001', 'ITEM001', 'PG01', 
      10, '是', '范广武', 'S0012', '上海精密机械有限公司', 15000.00, 
      '2025-04-01', '否', '测试用模板',
    ],
  ]

  // 子项明细 Sheet：使用 PO 号和 SAP 号作为关联键（而非序号）
  const subHeaders = ['关联 PO 号', '关联 SAP 号', 'SAP 号/图号', '物料名称', '数量']
  const subExampleRows: (string | number)[][] = [
    ['PO2025031001', 'SAP-100123', 'SAP-100123-A', '密封垫片 1', 5],
    ['PO2025031001', 'SAP-100123', 'SAP-100123-B', '密封垫片 2', 3],
  ]

  exportSheets('直接物料导入模板', [
    { name: '主记录', headers, rows: exampleRows },
    { name: '子项明细', headers: subHeaders, rows: subExampleRows },
  ])
  ElMessage.success('模板已下载，请按照格式填写后批量导入')
}

onMounted(loadList)
</script>

<style scoped>
.stat-row { margin-bottom: 16px; }
.stat-card { cursor: default; }
.stat-content { display: flex; align-items: center; gap: 14px; }
.stat-icon { width: 48px; height: 48px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
.stat-icon.blue { background: #e0f2fe; color: #0284c7; }
.stat-icon.green { background: #dcfce7; color: #16a34a; }
.stat-icon.orange { background: #fff7ed; color: #ea580c; }
.stat-icon.purple { background: #f3e8ff; color: #9333ea; }
.stat-info { display: flex; flex-direction: column; }
.stat-label { font-size: 13px; color: var(--el-text-color-secondary); }
.stat-value { font-size: 24px; font-weight: 700; color: var(--el-text-color-primary); }
.toolbar { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
.toolbar-left { display: flex; gap: 12px; align-items: center; }
.toolbar-right { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.dm-search { width: 320px; }
.dm-filter { width: 130px; }
.batch-bar { display: flex; align-items: center; gap: 16px; padding: 10px 16px; background: var(--el-fill-color-light); border-radius: 6px; margin-top: 12px; }
.selected-text { font-size: 13px; }
.primary-strong { color: var(--el-color-primary); }
.data-table { width: 100%; margin-top: 16px; }
.code-text { font-family: monospace; letter-spacing: 0.5px; }
.pagination-bar { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; }
.record-count { color: var(--el-text-color-secondary); font-size: 13px; }
.full-width { width: 100%; }
/* 子项展开区 */
.sub-item-panel { padding: 12px 16px 16px 48px; background: var(--el-fill-color-light); }
.sub-toolbar { display: flex; align-items: center; margin-bottom: 10px; }
.sub-title { font-size: 13px; font-weight: 600; color: var(--el-text-color-primary); }
.sub-table { width: 100%; }
.sub-add-row, .sub-empty-add {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  cursor: pointer; color: var(--el-color-primary); font-size: 13px;
  border: 1px dashed var(--el-border-color); border-radius: 4px;
  transition: border-color .2s, background-color .2s;
}
.sub-add-row { width: 100%; padding: 8px 0; box-sizing: border-box; }
.sub-empty-add { padding: 16px 0; margin: 4px 12px; }
.sub-add-row:hover, .sub-empty-add:hover {
  border-color: var(--el-color-primary); background: var(--el-color-primary-light-9);
}
</style>
