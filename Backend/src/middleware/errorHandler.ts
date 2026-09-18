import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
    statusCode: number;
    isOperational: boolean;

    constructor(message: string, statusCode: number, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}

export const errorHandler = (
    err: Error | AppError,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    console.error('Error:', err);

    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            error: err.message,
            status: err.statusCode
        });
    }

    // Handle Prisma errors
    if (err.name === 'PrismaClientKnownRequestError') {
        const prismaError = err as any;
        if (prismaError.code === 'P2002') {
            return res.status(409).json({
                error: 'Duplicate entry',
                field: prismaError.meta?.target
            });
        }
        if (prismaError.code === 'P2025') {
            return res.status(404).json({
                error: 'Record not found'
            });
        }
        if (prismaError.code === 'P2003') {
            return res.status(400).json({
                error: 'Related record not found (invalid ID provided)'
            });
        }
    }

    // Handle JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Invalid token' });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
    }

    // Handle validation errors
    if (err.name === 'ZodError') {
        const zodError = err as any;
        const firstError = zodError.errors?.[0]?.message || 'Validation failed';
        return res.status(400).json({
            error: firstError,
            details: zodError.errors
        });
    }

    // Default error
    return res.status(500).json({
        error: process.env.NODE_ENV === 'production' 
            ? 'Internal server error' 
            : err.message
    });
};