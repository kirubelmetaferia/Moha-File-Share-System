import app from './app';
import dotenv from 'dotenv';
import { SettingsService } from './services/settingsService';

dotenv.config();

const PORT = process.env.PORT || 5000;
const settingsService = new SettingsService();

let server: any;

const startServer = async () => {
    try {
        await settingsService.initSettings();
        console.log('⚙️ System settings initialized');
    } catch (err) {
        console.error('❌ Failed to initialize system settings:', err);
    }

    server = app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🔐 JWT Secret: ${process.env.JWT_SECRET ? '✅ Set' : '❌ Not set'}`);
    });

    server.on('error', (err: any) => {
        console.error('Express server error:', err);
    });
};

startServer();

setInterval(() => {
    // Keep event loop alive
}, 60000);

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    if (server) {
        server.close(() => {
            console.log('HTTP server closed');
        });
    }
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
});

export default server;
