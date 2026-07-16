<template>
  <div class="config-page">
    <el-tabs v-model="activeTab" type="card">
      <!-- ==================== 仓库管理 Tab ==================== -->
      <el-tab-pane label="仓库管理" name="warehouse">
        <!-- 统计卡片 -->
        <el-row :gutter="16" class="stat-row">
          <el-col :span="8"><el-card shadow="never" class="stat-card">
            <div class="stat-content"><div class="stat-icon blue"><el-icon :size="22"><Box /></el-icon></div>
            <div class="stat-info"><div class="stat-label">仓库总数</div><div class="stat-value">{{ whStats.total }}</div></div></div>
          </el-card></el-col>
          <el-col :span="8"><el-card shadow="never" class="stat-card">
            <div class="stat-content"><div class="stat-icon orange"><el-icon :size="22"><OfficeBuilding /></el-icon></div>
            <div class="stat-info"><div class="stat-label">室内仓库</div><div class="stat-value">{{ whStats.indoor }}</div></div></div>
          </el-card></el-col>
          <el-col :span="8"><el-card shadow="never" class="stat-card">
            <div class="stat-content"><div class="stat-icon green"><el-icon :size="22"><Sunny /></el-icon></div>
            <div class="stat-info"><div class="stat-label">室外仓库</div><div class="stat-value">{{ whStats.outdoor }}</div></div></div>
          </el-card></el-col>
        </el-row>
        <!-- 工具栏 -->
        <div class="toolbar"><div class="toolbar-left">
          <el-input v-model="whKeyword" placeholder="搜索仓库名称、位置、属性..." clearable class="wh-search" @input="onWhSearch" @clear="loadWarehouses" />
        </div><div class="toolbar-right">
          <el-button @click="exportWarehouses"><el-icon><Download /></el-icon> 批量导出</el-button>
          <el-button type="warning" @click="batchWhDialogVisible = true"><el-icon><DocumentCopy /></el-icon> 批量新增</el-button>
          <el-button type="primary" @click="openWhAdd"><el-icon><Plus /></el-icon> 新增仓库</el-button>
        </div></div>
        <!-- 表格 -->
        <el-table :data="whPageData" stripe border size="small" v-loading="whLoading" class="data-table">
          <el-table-column type="index" label="序号" width="60" align="center" :index="(i: number) => (whPage - 1) * PAGE_SIZE + i + 1" />
          <el-table-column prop="name" label="仓库名称" min-width="100">
            <template #default="{ row }"><strong class="name-strong">{{ row.name }}</strong></template>
          </el-table-column>
          <el-table-column prop="location" label="位置" min-width="120" show-overflow-tooltip />
          <el-table-column prop="attribute" label="属性" min-width="110" align="center">
            <template #default="{ row }"><el-tag :type="attrTagType(row.attribute)" size="small">{{ row.attribute }}</el-tag></template>
          </el-table-column>
          <el-table-column prop="type" label="类型" min-width="90" align="center">
            <template #default="{ row }"><el-tag type="info" size="small">{{ row.type }}</el-tag></template>
          </el-table-column>
          <el-table-column prop="createTime" label="创建时间" min-width="110">
            <template #default="{ row }">{{ formatDate(row.createTime) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="150" align="center" fixed="right">
            <template #default="{ row }">
              <el-button size="small" @click="openWhEdit(row)"><el-icon><Edit /></el-icon> 编辑</el-button>
              <el-button size="small" type="danger" v-permission="['admin']" @click="confirmWhDelete(row)"><el-icon><Delete /></el-icon></el-button>
            </template>
          </el-table-column>
        </el-table>
        <div class="pagination-bar">
          <span class="record-count">共 {{ whFiltered.length }} 条记录</span>
          <el-pagination v-model:current-page="whPage" :page-size="PAGE_SIZE" :total="whFiltered.length" layout="prev,pager,next" />
        </div>
      </el-tab-pane>

      <!-- ==================== 库位管理 Tab ==================== -->
      <el-tab-pane label="库位管理" name="location">
        <div class="toolbar"><div class="toolbar-left">
          <el-input v-model="locKeyword" placeholder="搜索库位编号、负责人员..." clearable class="loc-search" @input="onLocSearch" @clear="loadLocations" />
          <el-select v-model="locWhFilter" placeholder="全部仓库" clearable class="loc-wh-filter" @change="loadLocations">
            <el-option v-for="w in warehouseList" :key="w.name" :label="w.name" :value="w.name" />
          </el-select>
        </div><div class="toolbar-right">
          <el-button @click="exportLocations"><el-icon><Download /></el-icon> 批量导出</el-button>
          <el-button type="warning" @click="openBatchLocAdd"><el-icon><DocumentCopy /></el-icon> 批量新增</el-button>
          <el-button type="primary" @click="openLocAdd"><el-icon><Plus /></el-icon> 新增库位</el-button>
        </div></div>
        <!-- 批量操作栏 -->
        <div v-if="locSelected.size > 0" class="batch-bar">
          <el-checkbox v-model="locSelectAll" @change="onLocSelectAll">全选</el-checkbox>
          <span class="selected-text">已选 <strong class="primary-strong">{{ locSelected.size }}</strong> 项</span>
          <el-button type="danger" size="small" v-permission="['admin']" @click="confirmLocBatchDelete"><el-icon><Delete /></el-icon> 批量删除</el-button>
        </div>
        <!-- 表格 -->
        <el-table :data="locPageData" stripe border size="small" v-loading="locLoading" class="data-table">
          <el-table-column type="selection" width="50" align="center" :selectable="() => true" @selection-change="onLocSelectionChange" />
          <el-table-column type="index" label="序号" width="60" align="center" :index="(i: number) => (locPage - 1) * PAGE_SIZE + i + 1" />
          <el-table-column prop="warehouseName" label="仓库名称" min-width="90" align="center">
            <template #default="{ row }"><el-tag size="small">{{ row.warehouseName }}</el-tag></template>
          </el-table-column>
          <el-table-column prop="locationCode" label="库位编号" min-width="110">
            <template #default="{ row }"><span class="code-text">{{ row.locationCode }}</span></template>
          </el-table-column>
          <el-table-column prop="manager" label="负责人员" min-width="90" />
          <el-table-column prop="size" label="库位尺寸" min-width="130" show-overflow-tooltip />
          <el-table-column prop="createTime" label="创建时间" min-width="110">
            <template #default="{ row }">{{ formatDate(row.createTime) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="150" align="center" fixed="right">
            <template #default="{ row }">
              <el-button size="small" @click="openLocEdit(row)"><el-icon><Edit /></el-icon> 编辑</el-button>
              <el-button size="small" type="danger" v-permission="['admin']" @click="confirmLocDelete(row)"><el-icon><Delete /></el-icon></el-button>
            </template>
          </el-table-column>
        </el-table>
        <div class="pagination-bar">
          <span class="record-count">共 {{ locFiltered.length }} 条记录</span>
          <el-pagination v-model:current-page="locPage" :page-size="PAGE_SIZE" :total="locFiltered.length" layout="prev,pager,next" />
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- ==================== 新增/编辑仓库弹窗 ==================== -->
    <el-dialog v-model="whDialogVisible" :title="whIsEdit ? '编辑仓库' : '新增仓库'" width="520px" destroy-on-close>
      <el-form ref="whFormRef" :model="whForm" :rules="whRules" label-width="80px">
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="仓库名称" prop="name">
            <el-input v-model="whForm.name" placeholder="必填，大写字母如 A" @input="(v: string) => whForm.name = v.toUpperCase()" />
          </el-form-item></el-col>
          <el-col :span="12"><el-form-item label="位置" prop="location">
            <el-input v-model="whForm.location" placeholder="如：一号厂房东侧" />
          </el-form-item></el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="属性" prop="attribute">
            <el-select v-model="whForm.attribute" placeholder="请选择" class="full-width">
              <el-option v-for="a in ATTR_OPTIONS" :key="a" :label="a" :value="a" />
            </el-select>
          </el-form-item></el-col>
          <el-col :span="12"><el-form-item label="类型" prop="type">
            <el-select v-model="whForm.type" placeholder="请选择" class="full-width">
              <el-option v-for="t in TYPE_OPTIONS" :key="t" :label="t" :value="t" />
            </el-select>
          </el-form-item></el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="whDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="whSubmitting" @click="submitWh">{{ whIsEdit ? '保存修改' : '新增仓库' }}</el-button>
      </template>
    </el-dialog>

    <!-- ==================== 批量新增仓库弹窗 ==================== -->
    <el-dialog v-model="batchWhDialogVisible" title="批量新增仓库" width="520px" destroy-on-close>
      <el-form ref="batchWhFormRef" :model="batchWhForm" :rules="batchWhRules" label-width="80px">
        <el-form-item label="仓库列表" prop="entries">
          <el-input v-model="batchWhForm.entries" type="textarea" :rows="6" placeholder="每行一个，格式：名称,位置&#10;如：&#10;E,三号厂房东侧&#10;F,三号厂房西侧" />
          <div class="field-hint">名称自动转大写；已存在的名称将自动跳过</div>
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="属性" prop="attribute">
            <el-select v-model="batchWhForm.attribute" placeholder="请选择" class="full-width">
              <el-option v-for="a in ATTR_OPTIONS" :key="a" :label="a" :value="a" />
            </el-select>
          </el-form-item></el-col>
          <el-col :span="12"><el-form-item label="类型" prop="type">
            <el-select v-model="batchWhForm.type" placeholder="请选择" class="full-width">
              <el-option v-for="t in TYPE_OPTIONS" :key="t" :label="t" :value="t" />
            </el-select>
          </el-form-item></el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="batchWhDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="batchWhSubmitting" @click="submitBatchWh">批量新增</el-button>
      </template>
    </el-dialog>

    <!-- ==================== 新增/编辑库位弹窗 ==================== -->
    <el-dialog v-model="locDialogVisible" :title="locIsEdit ? '编辑库位' : '新增库位'" width="520px" destroy-on-close>
      <el-form ref="locFormRef" :model="locForm" :rules="locRules" label-width="80px">
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="仓库名称" prop="warehouseName">
            <el-select v-model="locForm.warehouseName" placeholder="请选择" class="full-width">
              <el-option v-for="w in warehouseList" :key="w.name" :label="w.name" :value="w.name" />
            </el-select>
          </el-form-item></el-col>
          <el-col :span="12"><el-form-item label="库位编号" prop="locationCode">
            <el-input v-model="locForm.locationCode" placeholder="如：A-01-01" />
          </el-form-item></el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="负责人员" prop="manager">
            <el-input v-model="locForm.manager" placeholder="如：范广武" />
          </el-form-item></el-col>
          <el-col :span="12"><el-form-item label="库位尺寸" prop="size">
            <el-input v-model="locForm.size" placeholder="如：2m x 1.5m x 1.8m" />
          </el-form-item></el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="locDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="locSubmitting" @click="submitLoc">{{ locIsEdit ? '保存修改' : '新增库位' }}</el-button>
      </template>
    </el-dialog>

    <!-- ==================== 批量新增库位弹窗 ==================== -->
    <el-dialog v-model="batchLocDialogVisible" title="批量新增库位" width="520px" destroy-on-close>
      <el-form ref="batchLocFormRef" :model="batchLocForm" :rules="batchLocRules" label-width="80px">
        <el-form-item label="仓库名称" prop="warehouseName">
          <el-select v-model="batchLocForm.warehouseName" placeholder="请选择" class="full-width">
            <el-option v-for="w in warehouseList" :key="w.name" :label="w.name" :value="w.name" />
          </el-select>
        </el-form-item>
        <el-form-item label="库位编号" prop="codes">
          <el-input v-model="batchLocForm.codes" type="textarea" :rows="5" placeholder="每行一个，必须以仓库名开头&#10;如：A-03-01&#10;A-03-02" />
          <div class="field-hint">编号必须以「仓库名-」开头，已存在的自动跳过</div>
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="负责人员" prop="manager">
            <el-input v-model="batchLocForm.manager" placeholder="如：范广武" />
          </el-form-item></el-col>
          <el-col :span="12"><el-form-item label="库位尺寸" prop="size">
            <el-input v-model="batchLocForm.size" placeholder="如：2m x 1.5m x 1.8m" />
          </el-form-item></el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="batchLocDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="batchLocSubmitting" @click="submitBatchLoc">批量新增</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
import { Box, OfficeBuilding, Sunny, Download, DocumentCopy, Plus, Edit, Delete } from '@element-plus/icons-vue'
import type { Warehouse, Location } from '@/types'
import { getWarehouses, createWarehouse, updateWarehouse, deleteWarehouse, batchCreateWarehouses, getLocations, createLocation, updateLocation, deleteLocation, batchCreateLocations, batchDeleteLocations } from '@/api/config.api'
import { exportToExcel } from '@/utils/export'

const PAGE_SIZE = 10
const ATTR_OPTIONS = ['室内/封闭', '室内/半封闭', '室内/不封闭', '室外/封闭', '室外/半封闭', '室外/不封闭']
const TYPE_OPTIONS = ['货架', '地面', '货架+地面']
const ATTR_TAG: Record<string, 'primary' | 'success' | 'warning' | 'info' | 'danger'> = {
  '室内/封闭': 'primary', '室内/半封闭': 'success', '室内/不封闭': 'warning',
  '室外/封闭': 'info', '室外/半封闭': 'success', '室外/不封闭': 'danger',
}
const attrTagType = (a: string) => ATTR_TAG[a] || 'info'
const formatDate = (iso: string) => iso ? new Date(iso).toISOString().slice(0, 10) : ''

const activeTab = ref('warehouse')

// ==================== 仓库管理 ====================
const whLoading = ref(false)
const warehouseList = ref<Warehouse[]>([])
const whKeyword = ref('')
const whPage = ref(1)

const whFiltered = computed(() => warehouseList.value)
const whPageData = computed(() => {
  const s = (whPage.value - 1) * PAGE_SIZE
  return whFiltered.value.slice(s, s + PAGE_SIZE)
})
const whStats = computed(() => ({
  total: warehouseList.value.length,
  indoor: warehouseList.value.filter(w => w.attribute.startsWith('室内')).length,
  outdoor: warehouseList.value.filter(w => w.attribute.startsWith('室外')).length,
}))

let whSearchTimer: ReturnType<typeof setTimeout> | null = null
function onWhSearch() { if (whSearchTimer) clearTimeout(whSearchTimer); whSearchTimer = setTimeout(() => { whPage.value = 1 }, 300) }

async function loadWarehouses() {
  whLoading.value = true
  try {
    const res = await getWarehouses(whKeyword.value || undefined)
    warehouseList.value = res.data.list || []
  } finally { whLoading.value = false }
}

// 仓库弹窗
const whDialogVisible = ref(false)
const whIsEdit = ref(false)
const whEditingId = ref<number | null>(null)
const whSubmitting = ref(false)
const whFormRef = ref<FormInstance>()
const whForm = reactive({ name: '', location: '', attribute: '', type: '' })
const whRules = {
  name: [{ required: true, message: '仓库名称不能为空', trigger: 'blur' }],
  location: [{ required: true, message: '位置不能为空', trigger: 'blur' }],
  attribute: [{ required: true, message: '请选择属性', trigger: 'change' }],
  type: [{ required: true, message: '请选择类型', trigger: 'change' }],
}

function resetWhForm() { whForm.name = ''; whForm.location = ''; whForm.attribute = ''; whForm.type = ''; whEditingId.value = null; whIsEdit.value = false }
function openWhAdd() { resetWhForm(); whDialogVisible.value = true }
function openWhEdit(row: any) {
  resetWhForm(); whIsEdit.value = true; whEditingId.value = row.id
  whForm.name = row.name; whForm.location = row.location; whForm.attribute = row.attribute; whForm.type = row.type
  whDialogVisible.value = true
}

async function submitWh() {
  if (!whFormRef.value) return; await whFormRef.value.validate()
  whSubmitting.value = true
  try {
    if (whIsEdit.value && whEditingId.value !== null) {
      const res = await updateWarehouse(whEditingId.value, { name: whForm.name, location: whForm.location, attribute: whForm.attribute, type: whForm.type })
      if (res.code === 200) { ElMessage.success(`仓库「${whForm.name}」已更新`); whDialogVisible.value = false; loadWarehouses() }
      else ElMessage.error(res.message)
    } else {
      const res = await createWarehouse({ name: whForm.name, location: whForm.location, attribute: whForm.attribute, type: whForm.type })
      if (res.code === 200) { ElMessage.success(`仓库「${whForm.name}」新增成功`); whDialogVisible.value = false; loadWarehouses() }
      else ElMessage.error(res.message)
    }
  } catch { ElMessage.error('操作失败') } finally { whSubmitting.value = false }
}

async function confirmWhDelete(row: any) {
  await ElMessageBox.confirm(`确定删除仓库「${row.name}」？删除后无法恢复。`, '确认删除', { type: 'warning' })
  const res = await deleteWarehouse(row.id)
  if (res.code === 200) { ElMessage.success(`仓库「${row.name}」已删除`); loadWarehouses() }
  else ElMessage.error(res.message)
}

// 批量仓库弹窗
const batchWhDialogVisible = ref(false)
const batchWhSubmitting = ref(false)
const batchWhFormRef = ref<FormInstance>()
const batchWhForm = reactive({ entries: '', attribute: '', type: '' })
const batchWhRules = {
  entries: [{ required: true, message: '请至少输入一个仓库', trigger: 'blur' }],
  attribute: [{ required: true, message: '请选择属性', trigger: 'change' }],
  type: [{ required: true, message: '请选择类型', trigger: 'change' }],
}

async function submitBatchWh() {
  if (!batchWhFormRef.value) return; await batchWhFormRef.value.validate()
  const lines = batchWhForm.entries.split('\n').map(l => l.trim()).filter(Boolean)
  if (!lines.length) { ElMessage.error('请至少输入一个仓库'); return }
  const items = lines.map(l => {
    const [name, ...rest] = l.split(/[,，]/).map(s => s.trim())
    return { name: (name || '').toUpperCase(), location: rest.join(',').trim() || '', attribute: batchWhForm.attribute, type: batchWhForm.type }
  }).filter(i => i.name)
  if (!items.length) { ElMessage.error('未解析到有效数据'); return }
  batchWhSubmitting.value = true
  try {
    const res = await batchCreateWarehouses(items)
    if (res.code === 200) { ElMessage.success(res.message); batchWhDialogVisible.value = false; batchWhForm.entries = ''; loadWarehouses() }
    else ElMessage.error(res.message)
  } catch { ElMessage.error('批量新增失败') } finally { batchWhSubmitting.value = false }
}

function exportWarehouses() {
  if (!warehouseList.value.length) { ElMessage.error('暂无仓库数据可导出'); return }
  const headers = ['序号', '仓库名称', '位置', '属性', '类型', '创建时间']
  const rows = warehouseList.value.map((w, i) => [i + 1, w.name, w.location, w.attribute, w.type, formatDate(w.createTime)] as (string | number)[])
  exportToExcel(`仓库数据导出-${formatDate(new Date().toISOString())}`, headers, rows, '仓库数据')
  ElMessage.success(`已导出 ${rows.length} 条仓库数据`)
}

// ==================== 库位管理 ====================
const locLoading = ref(false)
const locationList = ref<Location[]>([])
const locKeyword = ref('')
const locWhFilter = ref('')
const locPage = ref(1)
const locSelected = ref<Set<number>>(new Set())
const locSelectAll = ref(false)

const locFiltered = computed(() => locationList.value)
const locPageData = computed(() => {
  const s = (locPage.value - 1) * PAGE_SIZE
  return locFiltered.value.slice(s, s + PAGE_SIZE)
})

let locSearchTimer: ReturnType<typeof setTimeout> | null = null
function onLocSearch() { if (locSearchTimer) clearTimeout(locSearchTimer); locSearchTimer = setTimeout(() => { locPage.value = 1 }, 300) }

async function loadLocations() {
  locLoading.value = true
  try {
    const res = await getLocations(locWhFilter.value || undefined, locKeyword.value || undefined)
    locationList.value = res.data.list || []
  } finally { locLoading.value = false }
}

function onLocSelectionChange(rows: any[]) {
  locSelected.value = new Set(rows.map((r: any) => r.id))
  locSelectAll.value = rows.length > 0 && rows.length === locPageData.value.length
}
function onLocSelectAll(_val: boolean | string | number) {
  // handled by @selection-change
}

async function confirmLocBatchDelete() {
  const ids = Array.from(locSelected.value)
  await ElMessageBox.confirm(`确定删除选中的 ${ids.length} 个库位？`, '确认删除', { type: 'warning' })
  const res = await batchDeleteLocations(ids)
  if (res.code === 200) { ElMessage.success(res.message); locSelected.value.clear(); loadLocations() }
  else ElMessage.error(res.message)
}

// 库位弹窗
const locDialogVisible = ref(false)
const locIsEdit = ref(false)
const locEditingId = ref<number | null>(null)
const locSubmitting = ref(false)
const locFormRef = ref<FormInstance>()
const locForm = reactive({ warehouseName: '', locationCode: '', manager: '', size: '' })

const locPrefixValidator = (_rule: any, value: string, callback: any) => {
  if (!locIsEdit.value && locForm.warehouseName && !value.startsWith(locForm.warehouseName + '-')) {
    callback(new Error(`编号必须以「${locForm.warehouseName}-」开头`))
  } else callback()
}
const locRules = {
  warehouseName: [{ required: true, message: '请选择仓库', trigger: 'change' }],
  locationCode: [{ required: true, message: '库位编号不能为空', trigger: 'blur' }, { validator: locPrefixValidator, trigger: 'blur' }],
  manager: [{ required: true, message: '负责人员不能为空', trigger: 'blur' }],
  size: [{ required: true, message: '库位尺寸不能为空', trigger: 'blur' }],
}

function resetLocForm() { locForm.warehouseName = ''; locForm.locationCode = ''; locForm.manager = ''; locForm.size = ''; locEditingId.value = null; locIsEdit.value = false }
function openLocAdd() { resetLocForm(); locDialogVisible.value = true }
function openLocEdit(row: any) {
  resetLocForm(); locIsEdit.value = true; locEditingId.value = row.id
  locForm.warehouseName = row.warehouseName; locForm.locationCode = row.locationCode; locForm.manager = row.manager; locForm.size = row.size
  locDialogVisible.value = true
}

async function submitLoc() {
  if (!locFormRef.value) return; await locFormRef.value.validate()
  locSubmitting.value = true
  try {
    const data = { warehouseName: locForm.warehouseName, locationCode: locForm.locationCode, manager: locForm.manager, size: locForm.size }
    if (locIsEdit.value && locEditingId.value !== null) {
      const res = await updateLocation(locEditingId.value, data)
      if (res.code === 200) { ElMessage.success(`库位「${locForm.locationCode}」已更新`); locDialogVisible.value = false; loadLocations() }
      else ElMessage.error(res.message)
    } else {
      const res = await createLocation(data)
      if (res.code === 200) { ElMessage.success(`库位「${locForm.locationCode}」新增成功`); locDialogVisible.value = false; loadLocations() }
      else ElMessage.error(res.message)
    }
  } catch { ElMessage.error('操作失败') } finally { locSubmitting.value = false }
}

async function confirmLocDelete(row: any) {
  await ElMessageBox.confirm(`确定删除库位「${row.locationCode}」？`, '确认删除', { type: 'warning' })
  const res = await deleteLocation(row.id)
  if (res.code === 200) { ElMessage.success(`库位「${row.locationCode}」已删除`); loadLocations() }
  else ElMessage.error(res.message)
}

// 批量库位弹窗
const batchLocDialogVisible = ref(false)
const batchLocSubmitting = ref(false)
const batchLocFormRef = ref<FormInstance>()
const batchLocForm = reactive({ warehouseName: '', codes: '', manager: '', size: '' })

const batchLocPrefixValidator = (_rule: any, value: string, callback: any) => {
  if (batchLocForm.warehouseName && value.trim()) {
    const prefix = batchLocForm.warehouseName + '-'
    const bad = value.split('\n').map(l => l.trim()).filter(Boolean).filter(l => !l.startsWith(prefix))
    if (bad.length) { callback(new Error(`以下编号未以「${prefix}」开头：${bad.join('、')}`)); return }
  }
  callback()
}
const batchLocRules = {
  warehouseName: [{ required: true, message: '请选择仓库', trigger: 'change' }],
  codes: [{ required: true, message: '请至少输入一个库位编号', trigger: 'blur' }, { validator: batchLocPrefixValidator, trigger: 'blur' }],
  manager: [{ required: true, message: '负责人员不能为空', trigger: 'blur' }],
  size: [{ required: true, message: '库位尺寸不能为空', trigger: 'blur' }],
}

function openBatchLocAdd() {
  if (!warehouseList.value.length) { ElMessage.warning('请先创建仓库，再进行库位管理'); return }
  batchLocForm.warehouseName = ''; batchLocForm.codes = ''; batchLocForm.manager = ''; batchLocForm.size = ''
  batchLocDialogVisible.value = true
}

async function submitBatchLoc() {
  if (!batchLocFormRef.value) return; await batchLocFormRef.value.validate()
  const codes = batchLocForm.codes.split('\n').map(l => l.trim()).filter(Boolean)
  if (!codes.length) { ElMessage.error('请至少输入一个库位编号'); return }
  const items = codes.map(code => ({ warehouseName: batchLocForm.warehouseName, locationCode: code, manager: batchLocForm.manager, size: batchLocForm.size }))
  batchLocSubmitting.value = true
  try {
    const res = await batchCreateLocations(items)
    if (res.code === 200) { ElMessage.success(res.message); batchLocDialogVisible.value = false; loadLocations() }
    else ElMessage.error(res.message)
  } catch { ElMessage.error('批量新增失败') } finally { batchLocSubmitting.value = false }
}

function exportLocations() {
  if (!locationList.value.length) { ElMessage.error('暂无库位数据可导出'); return }
  const headers = ['序号', '仓库名称', '库位编号', '负责人员', '库位尺寸', '创建时间']
  const rows = locationList.value.map((l, i) => [i + 1, l.warehouseName, l.locationCode, l.manager, l.size, formatDate(l.createTime)] as (string | number)[])
  exportToExcel(`库位数据导出-${formatDate(new Date().toISOString())}`, headers, rows, '库位数据')
  ElMessage.success(`已导出 ${rows.length} 条库位数据`)
}

// ==================== 初始化 ====================
watch(activeTab, (tab) => {
  if (tab === 'warehouse') loadWarehouses()
  else loadLocations()
})

onMounted(() => { loadWarehouses(); loadLocations() })
</script>

<style scoped>
.stat-card { cursor: default; }
.stat-content { display: flex; align-items: center; gap: 14px; }
.stat-icon { width: 48px; height: 48px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
.stat-icon.blue { background: #e0f2fe; color: #0284c7; }
.stat-icon.orange { background: #fff7ed; color: #ea580c; }
.stat-icon.green { background: #dcfce7; color: #16a34a; }
.stat-info { display: flex; flex-direction: column; }
.stat-label { font-size: 13px; color: var(--el-text-color-secondary); }
.stat-value { font-size: 26px; font-weight: 700; color: var(--el-text-color-primary); }
.toolbar { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
.toolbar-left { display: flex; gap: 12px; align-items: center; }
.toolbar-right { display: flex; gap: 8px; flex-wrap: wrap; }
.pagination-bar { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; }
.batch-bar { display: flex; align-items: center; gap: 16px; padding: 10px 16px; background: var(--el-fill-color-light); border-radius: 6px; margin-top: 12px; }
.stat-row { margin-bottom: 16px; }
.wh-search { width: 260px; }
.loc-search { width: 220px; }
.loc-wh-filter { width: 140px; }
.data-table { width: 100%; margin-top: 16px; }
.name-strong { letter-spacing: 1px; }
.code-text { font-family: monospace; letter-spacing: 1px; }
.record-count { color: var(--el-text-color-secondary); font-size: 13px; }
.full-width { width: 100%; }
.field-hint { font-size: 12px; color: var(--el-text-color-secondary); margin-top: 4px; }
.selected-text { font-size: 13px; }
.primary-strong { color: var(--el-color-primary); }
</style>
