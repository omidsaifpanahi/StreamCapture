// packages ------------------------------------------------------------------------------------------------------------
const puppeteer = require('puppeteer');
const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs').promises; // For file deletion

// modules -------------------------------------------------------------------------------------------------------------
const db = require('../db');
const logger = require('./logger');
const { checkFFmpegInstallation, isRecordingUrl } = require('./utils');

// ---------------------------------------------------------------------------------------------------------------------

// Object to store active recording processes
let recordingProcesses = {};

/**
 * Starts recording a webpage.
 * @param {string} url The URL to record.
 * @param {number} id The ID of the recording.
 * @returns {Promise<object>} An object containing message and id if the recording started successfully
 * @throws {Error} If the URL is already being recorded or if there's an error starting the recording.
 */
async function startRecording(url, id) {
    const resultCheckFFmpegInstallation = await checkFFmpegInstallation();
    if (!resultCheckFFmpegInstallation['success']) {
        throw new Error(resultCheckFFmpegInstallation['msg']);
    }

    if (await isRecordingUrl(url)) {
        throw new Error(`URL "${url}" is already being recorded.`);
    }

    let browser;
    try {
        // Launch Puppeteer in headless mode
        browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        // Go to the URL and wait for network idle or timeout
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 });

        // Define output file path
        const outputDir = path.join(__dirname, 'recordings');
        const outputFilePath = path.join(outputDir, `${id}.mp4`);
        await fs.mkdir(outputDir, { recursive: true });

        const frameRate = 30;
        const videoWidth = 1920;
        const videoHeight = 1080;
        const crf = 18; // مقدار CRF. بین 18-20 برای کیفیت بالا و 21-28 برای حجم کمتر

        let inputOption;
        if (os.platform() === 'win32') {
            inputOption = 'gdigrab';
        } else if (os.platform() === 'darwin') {
            inputOption = 'avfoundation';
        } else {
            inputOption = 'x11grab'; // پیش‌فرض برای لینوکس
        }

        const ffmpegArgs = [
            '-y',
            '-f',
            inputOption,
            '-r',
            frameRate.toString(),
            '-i',
            inputOption === 'avfoundation'
                ? '1:0'
                : inputOption === 'gdigrab'
                    ? 'desktop'
                    : ':99.0',
            '-vcodec',
            'libx264',
            '-crf',
            crf.toString(),
            '-vf',
            `scale=${videoWidth}:${videoHeight}`,
            '-preset',
            'ultrafast',
            '-movflags',
            'frag_keyframe+empty_moov',
            outputFilePath,
        ];

        logger.info(`Starting FFmpeg with arguments: ${ffmpegArgs.join(' ')}`);

        // Spawn ffmpeg process for recording
        const ffmpeg = spawn('ffmpeg', ffmpegArgs, {
            detached: true,
            stdio: 'pipe',
        });
        // Detached process to prevent Node.js from waiting, ignore inherit
        // stdio : ignore , inherit , pipe

        ffmpeg.stdout.on('data', (data) => {
            logger.info(`ffmpeg stdout: ${data}`);
        });

        ffmpeg.stderr.on('data', (data) => {
            logger.error(`ffmpeg stderr: ${data}`);
        });

        ffmpeg.on('close', (code) => {
            logger.info(`child process exited with code ${code}`);
        });

        // Handle ffmpeg errors
        ffmpeg.on('error', (error) => {
            logger.error('ffmpeg process error:', error);
            db.update(
                'UPDATE recordings SET status = ?, error = ? WHERE id = ?',
                ['failed', error.message, id],
            ).catch(console.error);
        });

        // Handle ffmpeg process exit
        ffmpeg.on('exit', (code, signal) => {
            logger.info(
                `ffmpeg process exited with code ${code} and signal ${signal}`,
            );
            if (code !== 0) {
                const errorMessage = `ffmpeg exited with error code ${code} and signal ${signal}`;
                logger.error(errorMessage);
                // Update the database with failed status and error message
                db.update(
                    'UPDATE recordings SET status = ?, error = ? WHERE id = ?',
                    ['failed', errorMessage, id],
                ).catch(console.error);
            } else {
                // Update the database with completed status
                db.update('UPDATE recordings SET status = ? WHERE id = ?', [
                    'completed',
                    id,
                ]).catch(console.error);
            }
        });

        recordingProcesses[id] = { browser, ffmpeg }; // Store processes

        // Insert recording information into the database
        await db.insert(
            'INSERT INTO recordings (id, url, status, output) VALUES (?, ?, ?, ?)',
            [id, url, 'recording', outputFilePath],
        );
        return { message: 'Recording started.', id };
    } catch (err) {
        logger.error('Error in start recording:', err);
        if (browser) {
            await browser.close(); // Close browser on error
        }
        db.update('UPDATE recordings SET status = ?, error = ? WHERE id = ?', [
            'failed',
            err.message,
            id,
        ]).catch(console.error);
        throw err;
    }
}

/**
 * Stops a recording.
 * @param {number} id The ID of the recording to stop.
 * @throws {Error} If the recording is not found.
 */
async function stopRecording(id) {
    if (recordingProcesses[id]) {
        const { browser, ffmpeg } = recordingProcesses[id];
        try {
            ffmpeg.kill('SIGINT'); // Stop ffmpeg process -- SIGTERM | SIGINT

            // Wait for ffmpeg to exit
            await new Promise((resolve) => {
                ffmpeg.on('exit', resolve);
            });

            await browser.close(); // Close Puppeteer browser
        } catch (error) {
            logger.error('Error in stop recording:', error);
        }
        delete recordingProcesses[id]; // Remove from active processes
        await db.update('UPDATE recordings SET status = ? WHERE id = ?', [
            'stopped',
            id,
        ]); // Update database status
    } else {
        throw new Error('Recording not found.');
    }
}

/**
 * Deletes a recording and its associated file.
 * @param {number} id The ID of the recording to delete.
 */
async function deleteRecording(id) {
    try {
        const rows = await db.select(
            'SELECT output FROM recordings WHERE id = ?',
            [id],
        );
        if (rows.length > 0) {
            const filePath = rows[0].output;
            try {
                await fs.unlink(filePath); // Delete the video file
                logger.info(`File ${filePath} deleted.`);
            } catch (err) {
                logger.error(`Error deleting file: ${err}`);
            }
        }
        await db.delete('DELETE FROM recordings WHERE id = ?', [id]); // Delete from database
    } catch (error) {
        logger.error('Error in delete recording:', error);
    }
}

module.exports = { startRecording, stopRecording, deleteRecording };
