// 打印标签 composable - 打开新窗口渲染并打印
import { ElMessage } from 'element-plus'
import { toQRDataURL } from './useQRCode'
import { buildQRText, type QRItem, type PrintTemplate } from './templateConfig'

function escapeHtml(text: string): string {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * 打开新窗口渲染标签并唤起打印对话框
 */
export async function printLabels(items: QRItem[], tpl: PrintTemplate): Promise<void> {
  if (!items || items.length === 0) {
    ElMessage.warning('没有可打印的标签')
    return
  }

  ElMessage.info(`正在准备打印 ${items.length} 个标签...`)

  // 预生成所有二维码 DataURL
  const dataURLs = await Promise.all(
    items.map(item => toQRDataURL(buildQRText(item), tpl.qrSize))
  )

  // mm 转 px (96 DPI)
  const pxPerMm = 3.78
  const labelW = Math.round(tpl.width * pxPerMm)
  const labelH = Math.round(tpl.height * pxPerMm)

  // 构建标签 HTML
  const labelsHtml = items.map((item, idx) => {
    const qrSrc = dataURLs[idx] || ''
    let infoHtml = ''
    if (tpl.showName && item.materialName) infoHtml += `<div class="print-row">物料: ${escapeHtml(item.materialName)}</div>`
    if (tpl.showCode && item.materialCode) infoHtml += `<div class="print-row">编号: ${escapeHtml(item.materialCode)}</div>`
    if (tpl.showOwner && item.owner) infoHtml += `<div class="print-row">所属人: ${escapeHtml(item.owner)}</div>`
    if (tpl.showDept && item.department) infoHtml += `<div class="print-row">部门: ${escapeHtml(item.department)}</div>`
    if (tpl.showWarehouse && item.warehouse) infoHtml += `<div class="print-row">仓库: ${escapeHtml(item.warehouse)}</div>`
    if (tpl.showLocation && item.location) infoHtml += `<div class="print-row">货位: ${escapeHtml(item.location)}</div>`

    return `
      <div class="print-label" style="width:${labelW}px;height:${labelH}px;">
        <img class="print-qr" src="${qrSrc}" width="${tpl.qrSize}" height="${tpl.qrSize}" />
        <div class="print-info" style="font-size:${tpl.fontSize}px;">${infoHtml}</div>
      </div>`
  }).join('')

  // 构建完整 HTML 页面
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>标签打印</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Microsoft YaHei', Arial, sans-serif; }
  .print-sheet { display: flex; flex-wrap: wrap; gap: 0; padding: 0; }
  .print-label {
    border: 1px solid #ccc;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 8px;
    page-break-inside: avoid;
  }
  .print-qr { margin-bottom: 6px; }
  .print-info { text-align: center; line-height: 1.4; }
  .print-row {
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;
  }
</style>
</head>
<body>
<div class="print-sheet">${labelsHtml}</div>
<script>
  window.onload = function() {
    setTimeout(function() { window.print(); window.close(); }, 300);
  };
<\/script>
</body>
</html>`

  const printWin = window.open('', '_blank')
  if (!printWin) {
    ElMessage.error('打印窗口被浏览器拦截，请允许弹出窗口后重试')
    return
  }
  printWin.document.write(html)
  printWin.document.close()
}
