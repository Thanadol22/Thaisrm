import { upload } from '@vercel/blob/client';
import { compressImage } from './imageCompressor';

export interface UploadImageResult {
  url: string;
  fileName: string;
  originalSize?: number;
  compressedSize?: number;
  isBlob: boolean;
}

/**
 * Upload an image file to Vercel Blob with automatic client-side compression
 * @param file The image File to upload
 * @param folder Target folder prefix (e.g. 'slips' or 'avatars')
 * @returns UploadImageResult containing the CDN URL
 */
export async function uploadImageToStorage(
  file: File,
  folder: 'slips' | 'avatars' | 'documents' = 'slips'
): Promise<UploadImageResult> {
  const originalSize = file.size;

  // 1. Compress image to max 1280px and ~200-500 KB
  const compressedFile = await compressImage(file, {
    maxWidth: 1280,
    maxHeight: 1280,
    quality: 0.82,
    mimeType: 'image/jpeg',
  });

  const compressedSize = compressedFile.size;
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const blobPath = `${folder}/${timestamp}_${sanitizedName}`;

  try {
    // 2. Attempt direct upload to Vercel Blob
    const blob = await upload(blobPath, compressedFile, {
      access: 'public',
      handleUploadUrl: '/api/upload',
    });

    return {
      url: blob.url,
      fileName: file.name,
      originalSize,
      compressedSize,
      isBlob: true,
    };
  } catch (error: any) {
    console.warn('Vercel Blob upload failed or token not set. Falling back to local Base64/DataURL for development:', error);

    // Fallback to data URL for local offline development if token is not available
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          url: reader.result as string,
          fileName: file.name,
          originalSize,
          compressedSize,
          isBlob: false,
        });
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(compressedFile);
    });
  }
}
