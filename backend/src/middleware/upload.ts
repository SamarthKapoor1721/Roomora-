import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Request } from 'express';
import multer from 'multer';
import { env } from '../config/env';
import { badRequest } from '../lib/errors';

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
]);

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
  'application/pdf': '.pdf',
};

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

/** Builds a multer instance that writes into `<UPLOAD_DIR>/<subdir>`. */
export function makeUploader(subdir: string) {
  const dest = path.join(env.upload.dir, subdir);
  ensureDir(dest);

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dest),
    filename: (_req, file, cb) => {
      const ext = EXT_BY_MIME[file.mimetype] ?? path.extname(file.originalname).toLowerCase();
      const safe = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
      cb(null, safe);
    },
  });

  return multer({
    storage,
    limits: {
      fileSize: env.upload.maxBytes,
      files: 10,
    },
    fileFilter: (_req: Request, file, cb) => {
      if (!ALLOWED_MIME.has(file.mimetype)) {
        return cb(badRequest(`Unsupported file type: ${file.mimetype}`));
      }
      // Reject path traversal attempts in the client-supplied name.
      if (file.originalname.includes('..') || file.originalname.includes('/')) {
        return cb(badRequest('Invalid file name'));
      }
      cb(null, true);
    },
  });
}

export function relativeUploadPath(absPath: string): string {
  return path.relative(env.upload.dir, absPath).split(path.sep).join('/');
}
