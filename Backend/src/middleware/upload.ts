import multer from 'multer';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import fs from 'fs';
import { SettingsService } from '../services/settingsService';

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const settingsService = new SettingsService();

const createDynamicMulter = async () => {
    let maxFileSizeMB = 50; // default
    let allowedExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg', 'zip', 'rar'];
    
    try {
        const sizeSetting = await settingsService.getSetting('storage.max_file_size_mb');
        if (sizeSetting && typeof sizeSetting.value === 'number') {
            maxFileSizeMB = sizeSetting.value;
        }

        const extSetting = await settingsService.getSetting('storage.allowed_extensions');
        if (extSetting && typeof extSetting.value === 'string') {
            allowedExts = extSetting.value.split(',').map(e => e.trim().toLowerCase());
        }
    } catch (error) {
        console.error('Failed to fetch upload settings, using defaults', error);
    }

    const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
        const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
        
        if (allowedExts.includes(ext)) {
            cb(null, true);
        } else {
            cb(new AppError(`File type not allowed. Allowed extensions: ${allowedExts.join(', ')}`, 400));
        }
    };

    return {
        multerInstance: multer({
            storage: storage,
            limits: {
                fileSize: maxFileSizeMB * 1024 * 1024
            },
            fileFilter: fileFilter
        }),
        maxFileSizeMB
    };
};

export const uploadSingle = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const contentLength = parseInt(req.headers['content-length'] || '0');
        const sizeSetting = await settingsService.getSetting('storage.max_file_size_mb');
        const maxFileSizeMB = sizeSetting && typeof sizeSetting.value === 'number' ? sizeSetting.value : 50;
        
        if (contentLength > maxFileSizeMB * 1024 * 1024) {
            return next(new AppError(`File too large. Maximum size is ${maxFileSizeMB}MB`, 413));
        }

        const { multerInstance, maxFileSizeMB: limitMB } = await createDynamicMulter();
        multerInstance.single('file')(req, res, (err: any) => {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return next(new AppError(`File too large. Maximum size is ${limitMB}MB`, 413));
                }
                return next(new AppError(err.message, 400));
            } else if (err) {
                return next(err);
            }
            next();
        });
    } catch (error) {
        next(error);
    }
};

export const uploadMultiple = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const contentLength = parseInt(req.headers['content-length'] || '0');
        const sizeSetting = await settingsService.getSetting('storage.max_file_size_mb');
        const maxFileSizeMB = sizeSetting && typeof sizeSetting.value === 'number' ? sizeSetting.value : 50;
        
        if (contentLength > maxFileSizeMB * 1024 * 1024 * 5) {
             return next(new AppError(`Payload too large.`, 413));
        }

        const { multerInstance, maxFileSizeMB: limitMB } = await createDynamicMulter();
        multerInstance.array('files', 5)(req, res, (err: any) => {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return next(new AppError(`File too large. Maximum size is ${limitMB}MB per file`, 413));
                }
                return next(new AppError(err.message, 400));
            } else if (err) {
                return next(err);
            }
            next();
        });
    } catch (error) {
        next(error);
    }
};