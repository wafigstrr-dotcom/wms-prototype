<template>
  <div class="qr-label-card" :style="cardStyle">
    <button v-if="removable" class="remove-btn" @click="$emit('remove')" title="移除">
      <el-icon><Close /></el-icon>
    </button>
    <div class="qr-wrap" :style="{ padding: Math.round(6 * scale) + 'px' }">
      <img v-if="imgSrc" :src="imgSrc" :width="displaySize" :height="displaySize" />
      <div v-else class="qr-placeholder" :style="{ width: displaySize + 'px', height: displaySize + 'px' }">
        <el-icon :size="24" color="#ccc"><Loading /></el-icon>
      </div>
    </div>
    <div class="qr-info" :style="{ fontSize: scaledFontSize + 'px' }">
      <template v-for="field in visibleFields" :key="field.label">
        <div class="info-row">
          <span class="info-label">{{ field.label }}:</span>
          <span class="info-value">{{ field.value }}</span>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { Close, Loading } from '@element-plus/icons-vue'
import { toQRDataURLFromItem } from './useQRCode'
import type { QRItem, PrintTemplate } from './templateConfig'

const props = withDefaults(defineProps<{
  item: QRItem
  template: PrintTemplate
  removable?: boolean
  maxSize?: number
}>(), {
  removable: false,
  maxSize: 300,
})

defineEmits<{ (e: 'remove'): void }>()

const imgSrc = ref('')

const displaySize = computed(() => Math.min(props.template.qrSize, props.maxSize))

// 计算缩放比例：当 maxSize 限制了二维码显示尺寸时，同比例缩放标签卡片尺寸以保持布局比例一致
const scale = computed(() => {
  return displaySize.value / props.template.qrSize
})

// 根据模板的 mm 宽度和高度计算像素尺寸，并乘以缩放比例
const cardStyle = computed(() => {
  const pxPerMm = 3.78
  const w = Math.round(props.template.width * pxPerMm * scale.value)
  const h = Math.round(props.template.height * pxPerMm * scale.value)
  return {
    width: `${w}px`,
    height: `${h}px`,
    padding: `${Math.round(16 * scale.value)}px`,
    gap: `${Math.round(10 * scale.value)}px`,
    boxSizing: 'border-box' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
  }
})

// 按比例缩放后的字体大小，且不小于 8px 保证可读
const scaledFontSize = computed(() => {
  return Math.max(8, Math.round(props.template.fontSize * scale.value))
})

const visibleFields = computed(() => {
  const tpl = props.template
  const item = props.item
  const fields: { label: string; value: string }[] = []
  if (tpl.showName && item.materialName) fields.push({ label: '物料', value: item.materialName })
  if (tpl.showCode && item.materialCode) fields.push({ label: '编号', value: item.materialCode })
  if (tpl.showOwner && item.owner) fields.push({ label: '所属人', value: item.owner })
  if (tpl.showDept && item.department) fields.push({ label: '部门', value: item.department })
  if (tpl.showWarehouse && item.warehouse) fields.push({ label: '仓库', value: item.warehouse })
  if (tpl.showLocation && item.location) fields.push({ label: '货位', value: item.location })
  return fields
})

async function generateQR() {
  imgSrc.value = await toQRDataURLFromItem(props.item, displaySize.value)
}

onMounted(generateQR)
watch(() => [props.item, props.template.qrSize], generateQR, { deep: true })
</script>

<style scoped>
.qr-label-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  position: relative;
  border: 1px solid #eee;
}

.remove-btn {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #fef0f0;
  color: #f56c6c;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: all 0.2s;
}

.remove-btn:hover {
  background: #f56c6c;
  color: #fff;
}

.qr-wrap {
  background: #fff;
  padding: 6px;
  border-radius: 4px;
  border: 1px solid #f0f0f0;
}

.qr-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
  border-radius: 4px;
}

.qr-info {
  text-align: center;
  line-height: 1.6;
  color: #333;
}

.info-row {
  display: flex;
  justify-content: center;
  gap: 4px;
}

.info-label {
  color: #909399;
}

.info-value {
  font-weight: 600;
}
</style>
