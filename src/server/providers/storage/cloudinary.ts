import 'server-only'
import { v2 as cloudinary } from 'cloudinary'
import type { StorageProvider, UploadTicket } from './index'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const PRESET = process.env.CLOUDINARY_UPLOAD_PRESET ?? 'luma_signed'

export const cloudinaryProvider: StorageProvider = {
  createUploadTicket(): UploadTicket {
    const timestamp = Math.round(Date.now() / 1000)
    const signature = cloudinary.utils.api_sign_request(
      { timestamp, upload_preset: PRESET },
      process.env.CLOUDINARY_API_SECRET!
    )
    return {
      provider: 'cloudinary',
      endpoint: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`,
      fields: {
        api_key: process.env.CLOUDINARY_API_KEY!,
        timestamp: String(timestamp),
        upload_preset: PRESET,
        signature,
      },
    }
  },

  async deleteAsset(key: string): Promise<void> {
    await cloudinary.uploader.destroy(key)
  },

  keyFromUrl(url: string): string | null {
    if (!url.includes('res.cloudinary.com')) return null

    const uploadMarker = '/upload/'
    const uploadIdx = url.indexOf(uploadMarker)
    if (uploadIdx === -1) return null

    // Everything after /upload/
    let after = url.slice(uploadIdx + uploadMarker.length)

    // Remove optional version prefix: v1234567890/
    after = after.replace(/^v\d+\//, '')

    // Remove file extension (strip from the last dot)
    const lastDot = after.lastIndexOf('.')
    if (lastDot !== -1) {
      after = after.slice(0, lastDot)
    }

    return after || null
  },
}
