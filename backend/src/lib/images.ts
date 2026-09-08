import fs from 'node:fs';
import path from 'node:path';
import { env } from '../config/env';
import { relativeUploadPath } from '../middleware/upload';
import { prisma } from './prisma';

type UploadedFile = Express.Multer.File;

/** Only real images belong in a listing gallery — reject a stray PDF. */
export function assertImages(files: UploadedFile[]): void {
  for (const f of files) {
    if (!f.mimetype.startsWith('image/')) {
      // The upload was already written to disk by multer; clean it up.
      fs.rm(f.path, { force: true }, () => undefined);
      throw new Error(`"${f.originalname}" is not an image`);
    }
  }
}

/** Rows to create for a batch of uploaded files, numbered after `startFrom`. */
export function imageRows(files: UploadedFile[], startFrom = 0) {
  return files.map((f, i) => ({
    originalName: f.originalname,
    storedName: path.basename(f.path),
    path: relativeUploadPath(f.path),
    mimeType: f.mimetype,
    sizeBytes: f.size,
    sortOrder: startFrom + i,
  }));
}

/** Delete the file backing an image row from disk (best-effort). */
export function unlinkImage(relPath: string): void {
  const abs = path.join(env.upload.dir, relPath);
  fs.rm(abs, { force: true }, () => undefined);
}

/** Shape an image row for API responses. */
export function publicImage(img: { id: string; path: string; originalName: string; sortOrder: number }) {
  return { id: img.id, url: `/uploads/${img.path}`, name: img.originalName, sortOrder: img.sortOrder };
}

export const propertyImages = {
  async add(propertyId: string, files: UploadedFile[]) {
    assertImages(files);
    const count = await prisma.propertyImage.count({ where: { propertyId } });
    return prisma.$transaction(
      imageRows(files, count).map((row) =>
        prisma.propertyImage.create({ data: { ...row, propertyId } }),
      ),
    );
  },
  async remove(propertyId: string, imageId: string) {
    const img = await prisma.propertyImage.findFirst({ where: { id: imageId, propertyId } });
    if (!img) return null;
    await prisma.propertyImage.delete({ where: { id: imageId } });
    unlinkImage(img.path);
    return img;
  },
};

export const roomImages = {
  async add(roomId: string, files: UploadedFile[]) {
    assertImages(files);
    const count = await prisma.roomImage.count({ where: { roomId } });
    return prisma.$transaction(
      imageRows(files, count).map((row) => prisma.roomImage.create({ data: { ...row, roomId } })),
    );
  },
  async remove(roomId: string, imageId: string) {
    const img = await prisma.roomImage.findFirst({ where: { id: imageId, roomId } });
    if (!img) return null;
    await prisma.roomImage.delete({ where: { id: imageId } });
    unlinkImage(img.path);
    return img;
  },
};
