/**
 * Client-side image compression utility using HTML5 Canvas
 * Reduces image size to ~200-500 KB before uploading to Vercel Blob
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0
  mimeType?: 'image/jpeg' | 'image/webp' | 'image/png';
}

/**
 * Compress an image File or Blob in the browser
 * @param file The original File or Blob
 * @param options Compression options (default: maxWidth=1280, quality=0.8, mimeType='image/jpeg')
 * @returns Promise<File> Compressed File object ready for upload
 */
export async function compressImage(
  file: File | Blob,
  options: CompressionOptions = {}
): Promise<File> {
  const {
    maxWidth = 1280,
    maxHeight = 1280,
    quality = 0.8,
    mimeType = 'image/jpeg',
  } = options;

  // If not running in browser, return original file
  if (typeof window === 'undefined') {
    return file instanceof File ? file : new File([file], 'image.jpg', { type: mimeType });
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect ratio fit within maxWidth & maxHeight
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file instanceof File ? file : new File([file], 'image.jpg', { type: mimeType }));
          return;
        }

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file instanceof File ? file : new File([file], 'image.jpg', { type: mimeType }));
              return;
            }

            const fileName = file instanceof File
              ? file.name.replace(/\.[^/.]+$/, "") + (mimeType === 'image/jpeg' ? '.jpg' : '.webp')
              : `compressed_${Date.now()}.jpg`;

            const compressedFile = new File([blob], fileName, {
              type: mimeType,
              lastModified: Date.now(),
            });

            resolve(compressedFile);
          },
          mimeType,
          quality
        );
      };

      img.onerror = (err) => {
        console.error('Error loading image for compression:', err);
        resolve(file instanceof File ? file : new File([file], 'image.jpg', { type: mimeType }));
      };
    };

    reader.onerror = (err) => {
      console.error('FileReader error during compression:', err);
      resolve(file instanceof File ? file : new File([file], 'image.jpg', { type: mimeType }));
    };
  });
}
