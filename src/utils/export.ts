import * as XLSX from 'xlsx'

/**
 * 通用 Excel 导出工具
 * @param filename 文件名（不含后缀）
 * @param headers 表头数组
 * @param rows 数据行数组（二维数组，每行对应表头列）
 * @param sheetName 工作表名称
 */
export function exportToExcel(
  filename: string,
  headers: string[],
  rows: (string | number)[][],
  sheetName = 'Sheet1',
): void {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

/**
 * 多工作表 Excel 导出工具
 * @param filename 文件名（不含后缀）
 * @param sheets 工作表数组，每个含 name/headers/rows
 */
export function exportSheets(
  filename: string,
  sheets: { name: string; headers: string[]; rows: (string | number)[][] }[],
): void {
  const wb = XLSX.utils.book_new()
  for (const s of sheets) {
    const ws = XLSX.utils.aoa_to_sheet([s.headers, ...s.rows])
    XLSX.utils.book_append_sheet(wb, ws, s.name)
  }
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

/** 物料类别选项（全局复用） */
export const MATERIAL_CATEGORIES = [
  '室外机', '室内机', '压缩机', '控制箱',
  '工装', '化学品', '新物料', '拆机物料', '工具辅料',
]
