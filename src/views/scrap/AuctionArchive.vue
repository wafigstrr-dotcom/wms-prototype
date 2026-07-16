<template>
  <div class="auction-archive">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <el-icon :size="18"><FolderOpened /></el-icon>
          <span>拍卖文件存档</span>
        </div>
      </template>

      <div v-if="loading" class="loading-block">
        <el-icon class="is-loading" :size="24"><Loading /></el-icon>
        <span class="loading-text">加载中...</span>
      </div>

      <div v-else class="file-list">
        <div v-for="(item, index) in AUCTION_FILES" :key="item.id" class="file-card">
          <div class="file-card-header">
            <div class="file-icon">
              <el-icon :size="22"><Document /></el-icon>
            </div>
            <div class="file-info">
              <div class="file-name">{{ index + 1 }}. {{ item.name }}</div>
              <div class="file-meta">
                <span v-if="getFiles(item.id).length > 0">已上传 {{ getFiles(item.id).length }} 个文件</span>
                <span v-else class="placeholder-text">暂未上传</span>
              </div>
            </div>
            <el-tag :type="getFiles(item.id).length > 0 ? 'success' : 'info'" size="small">
              {{ getFiles(item.id).length > 0 ? `已上传 ${getFiles(item.id).length} 个` : '待上传' }}
            </el-tag>
            <el-upload
              :auto-upload="true"
              :show-file-list="false"
              :http-request="(opt: any) => handleUpload(item.id, opt)"
              multiple
            >
              <el-button type="primary" size="small" plain>
                <el-icon><Upload /></el-icon> 上传
              </el-button>
            </el-upload>
          </div>

          <!-- 已上传文件列表 -->
          <div v-if="getFiles(item.id).length > 0" class="file-entries">
            <div v-for="(f, fi) in getFiles(item.id)" :key="fi" class="file-entry">
              <el-icon :size="14" color="var(--el-color-primary)"><Paperclip /></el-icon>
              <span class="entry-name">{{ f.fileName }}</span>
              <span class="entry-time">{{ formatDate(f.uploadTime) }}</span>
              <el-button size="small" text type="primary" @click="downloadFile(f)">
                <el-icon><Download /></el-icon>
              </el-button>
              <el-popconfirm title="确定删除该文件？" @confirm="handleDelete(item.id, fi)">
                <template #reference>
                  <el-button size="small" text type="danger">
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </template>
              </el-popconfirm>
            </div>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { FolderOpened, Loading, Document, Upload, Paperclip, Download, Delete } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getAuctionFiles, uploadAuctionFile, deleteAuctionFile } from '@/api/auction.api'
import type { AuctionFileItem } from '@/api/auction.api'

const AUCTION_FILES = [
  { id: 'auction_list', name: 'AEC 拍卖物料清单' },
  { id: 'auction_list_img', name: 'AEC 拍卖物料图文并茂清单' },
  { id: 'auction_bid_list', name: 'AEC 拍卖物料中标清单' },
  { id: 'auction_residual', name: 'AEC 拍卖物料清单残值版' },
  { id: 'scrap_scan', name: '物料处理申请单扫描版' },
  { id: 'pickup_sign', name: 'AEC 拍卖物料供应商提货签字单' },
  { id: 'supplier_bid', name: '供应商投标资料' },
  { id: 'bid_email', name: '开标邮件（PUR发的）' },
]

const loading = ref(false)
const filesData = ref<Record<string, AuctionFileItem[]>>({})

function getFiles(fileId: string): AuctionFileItem[] {
  return filesData.value[fileId] || []
}

function formatDate(iso: string) {
  if (!iso) return '-'
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

async function handleUpload(fileId: string, options: { file: File }) {
  const file = options.file
  try {
    await uploadAuctionFile(fileId, { fileName: file.name, fileSize: file.size })
    ElMessage.success(`上传成功：${file.name}`)
    await refresh()
  } catch {
    ElMessage.error('上传失败')
  }
}

function downloadFile(f: AuctionFileItem) {
  const blob = new Blob(
    [`这是模拟文件内容：${f.fileName}\n上传时间：${formatDate(f.uploadTime)}`],
    { type: 'text/plain' }
  )
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = f.fileName
  link.click()
  URL.revokeObjectURL(link.href)
  ElMessage.success('下载已开始')
}

async function handleDelete(fileId: string, index: number) {
  try {
    await deleteAuctionFile(fileId, index)
    ElMessage.success('文件已删除')
    await refresh()
  } catch {
    ElMessage.error('删除失败')
  }
}

async function refresh() {
  loading.value = true
  try {
    const res = await getAuctionFiles()
    filesData.value = res.data || {}
  } catch {
    filesData.value = {}
  } finally {
    loading.value = false
  }
}

defineExpose({ refresh })
onMounted(() => refresh())
</script>

<style scoped>
.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}
.loading-block {
  text-align: center;
  padding: 40px;
}
.loading-text {
  margin-left: 8px;
}
.placeholder-text {
  color: var(--el-text-color-placeholder);
}
.file-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.file-card {
  padding: 16px;
  background: var(--el-fill-color-lighter);
  border-radius: 8px;
  transition: background 0.2s;
}
.file-card:hover {
  background: var(--el-color-primary-light-9);
}
.file-card-header {
  display: flex;
  align-items: center;
  gap: 16px;
}
.file-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background: var(--el-bg-color);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--el-color-primary);
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
.file-info {
  flex: 1;
  min-width: 0;
}
.file-name {
  font-size: 14px;
  font-weight: 600;
}
.file-meta {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 2px;
}
.file-entries {
  margin-top: 10px;
  padding-left: 64px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.file-entry {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  font-size: 12px;
}
.entry-name {
  flex: 1;
}
.entry-time {
  color: var(--el-text-color-placeholder);
  min-width: 120px;
  text-align: right;
}
</style>
