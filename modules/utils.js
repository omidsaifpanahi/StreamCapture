// packages ------------------------------------------------------------------------------------------------------------
const { exec } = require('child_process');
// modules -------------------------------------------------------------------------------------------------------------
const db = require('../db');
const logger = require('./logger');

// ---------------------------------------------------------------------------------------------------------------------
async function checkFFmpegInstallation() {
    try {
        await exec('ffmpeg -version');
        logger.info('FFmpeg is installed.');
        return { success: true };
    } catch (error) {
        const data = {
            msg: 'FFmpeg is not installed. Please install FFmpeg and add it to your system PATH.',
            success: false,
        };
        logger.error(data['msg'], error);
        return data;
    }
}

/**
 * Checks if a URL is currently being recorded.
 * @param {string} url The URL to check.
 * @returns {Promise<boolean>} True if the URL is being recorded, false otherwise.
 */
async function isRecordingUrl(url) {
    try {
        const rows = await db.select(
            'SELECT * FROM recordings WHERE url = ? AND status = ?',
            [url, 'recording'],
        );
        return rows.length > 0;
    } catch (error) {
        logger.error('Error checking recording URL:', error);
        return false;
    }
}

module.exports = { checkFFmpegInstallation, isRecordingUrl };
