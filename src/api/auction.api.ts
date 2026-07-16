import request from '@/utils/request'
import type { ApiResponse } from '@/types'

export interface AuctionFileItem {
  fileName: string
  fileSize: number
  uploadTime: string
}

export type AuctionFilesData = Record<string, AuctionFileItem[]>

export function getAuctionFiles(): Promise<ApiResponse<AuctionFilesData>> {
  return request.get('/api/v1/auction/files')
}

export function uploadAuctionFile(
  fileId: string,
  file: { fileName: string; fileSize: number }
): Promise<ApiResponse<null>> {
  return request.post(`/api/v1/auction/files/${fileId}`, file)
}

export function deleteAuctionFile(fileId: string, index: number): Promise<ApiResponse<null>> {
  return request.delete(`/api/v1/auction/files/${fileId}/${index}`)
}
