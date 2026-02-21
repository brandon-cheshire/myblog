import multer from 'multer';
import { memoryStorage } from 'multer';
import { Request, Response } from 'express';

const upload = multer({
  storage: memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

/**
 * Process multer middleware within a ts-rest handler. Resolves with the uploaded file or rejects with an error.
 */
export function processMulterUpload(
  req: Request,
  res: Response,
  fieldName: string = 'profilePicture'
): Promise<Express.Multer.File> {
  return new Promise((resolve, reject) => {
    const multerMiddleware = upload.single(fieldName);
    multerMiddleware(req, res, (err) => {
      if (err) {
        reject(err);
        return;
      }
      const file = (req as Request & { file?: Express.Multer.File }).file;
      if (!file) {
        reject(new Error('No file uploaded'));
        return;
      }
      resolve(file);
    });
  });
}
