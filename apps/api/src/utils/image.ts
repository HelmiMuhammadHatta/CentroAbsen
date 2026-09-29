import sharp from 'sharp';
import { fileTypeFromBuffer } from 'file-type';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

export async function processAttendancePhoto(buffer: Buffer): Promise<string> {
  const fileType = await fileTypeFromBuffer(buffer);
  
  if (!fileType || fileType.mime !== 'image/jpeg') {
    throw new Error('Format foto harus JPEG');
  }

  if (buffer.length > 1024 * 1024) {
    throw new Error('Ukuran foto maksimal 1MB');
  }

  const processedBuffer = await sharp(buffer, { limitInputPixels: 4096 * 4096 })
    .rotate() // Putar sesuai EXIF & buang metadata EXIF tambahan
    .resize({ width: 1280, height: 1280, fit: 'inside' }) // Sisi terpanjang maksimal 1280px
    .jpeg({ quality: 75 })
    .toBuffer();

  const fileName = crypto.randomBytes(16).toString('hex') + '.jpg';
  const filePath = path.join(process.cwd(), 'uploads', fileName);
  
  // Pastikan folder ada
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, processedBuffer);

  return fileName;
}
