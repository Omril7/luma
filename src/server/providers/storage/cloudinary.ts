import 'server-only'
import { v2 as cloudinary } from 'cloudinary'
import type { StorageProvider, UploadFile, UploadResult } from './index'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export class CloudinaryStorageProvider implements StorageProvider {
  async save(file: UploadFile): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: 'image', folder: 'luma' },
        (err, result) => {
          if (err || !result) return reject(err ?? new Error('Cloudinary upload failed'))
          resolve({ url: result.secure_url, key: result.public_id })
        }
      )
      stream.end(file.buffer)
    })
  }

  async delete(key: string): Promise<void> {
    await cloudinary.uploader.destroy(key)
  }
}
