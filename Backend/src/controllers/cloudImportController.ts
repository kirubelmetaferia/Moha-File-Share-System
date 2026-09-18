import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { FileService } from '../services/fileService';
import { successResponse } from '../utils/response';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export class CloudImportController {
    private fileService = new FileService();

    constructor() {
        this.importFromGoogle = this.importFromGoogle.bind(this);
    }

    async importFromGoogle(req: Request, res: Response, next: NextFunction) {
        try {
            const { fileId, fileName, mimeType, accessToken, folderId } = req.body;
            const userId = req.user!.id;

            if (!fileId || !accessToken || !fileName) {
                throw new AppError('Missing required fields', 400);
            }

            // Download file from Google Drive
            const driveResponse = await axios.get(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                },
                responseType: 'stream'
            });

            // Stream to a temp file
            const tempFileName = crypto.randomBytes(16).toString('hex') + path.extname(fileName);
            const tempFilePath = path.join(process.cwd(), 'uploads', tempFileName);
            
            const writer = fs.createWriteStream(tempFilePath);
            driveResponse.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            const stats = fs.statSync(tempFilePath);

            // Construct a mock Multer file object
            const mockFile: Express.Multer.File = {
                fieldname: 'file',
                originalname: fileName,
                encoding: '7bit',
                mimetype: mimeType || 'application/octet-stream',
                destination: path.join(process.cwd(), 'uploads'),
                filename: tempFileName,
                path: tempFilePath,
                size: stats.size,
                stream: fs.createReadStream(tempFilePath),
                buffer: Buffer.from('')
            };

            // Pass to fileService to handle versioning, audits, limits, etc.
            const file = await this.fileService.uploadFile({
                file: mockFile,
                uploadedBy: userId,
                folderId: folderId
            });

            res.status(201).json(successResponse(file, 'File imported successfully from Google Drive'));
        } catch (error) {
            next(error);
        }
    }
}
