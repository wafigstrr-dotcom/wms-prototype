// QR 码生成 composable - 封装 qrcode npm 库
import QRCode from 'qrcode'
import { buildQRText, type QRItem } from './templateConfig'

/**
 * 生成二维码的 base64 DataURL（PNG），可用于 <img :src> 或打印窗口
 */
export async function toQRDataURL(text: string, size: number): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: size,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#ffffff' },
    })
  } catch {
    return ''
  }
}

/**
 * 根据物料信息生成二维码 DataURL
 */
export async function toQRDataURLFromItem(item: QRItem, size: number): Promise<string> {
  const text = buildQRText(item)
  if (!text) return ''
  return toQRDataURL(text, size)
}

export { buildQRText }
