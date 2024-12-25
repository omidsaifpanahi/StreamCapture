const express = require('express');
const {
    startRecording,
    stopRecording,
    deleteRecording,
} = require('./modules/recorder');
const db = require('./db');
const logger = require('./modules/logger');
const app = express();
const port = process.env.PORT || 3000;
const bodyParser = require('body-parser');

app.use(bodyParser.json());

// Middleware for input validation
const validateRecordingInput = (req, res, next) => {
    const { url, id } = req.body;
    if (!url || !id) {
        return res.status(400).json({ error: 'URL and ID are required.' });
    }
    if (typeof id !== 'number' || id <= 0) {
        return res.status(400).json({ error: 'ID must be a positive number.' });
    }

    try {
        new URL(url);
    } catch (error) {
        logger.error(error);
        return res.status(400).json({ error: 'Invalid URL format.' });
    }
    next();
};

app.post('/api/start', validateRecordingInput, async (req, res) => {
    const { url, id } = req.body;
    try {
        const result = await startRecording(url, id);
        res.status(200).json(result);
    } catch (err) {
        logger.error('Error in /api/start:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/status/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const rows = await db.select('SELECT * FROM recordings WHERE id = ?', [
            parseInt(id),
        ]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Recording not found.' });
        }
        res.status(200).json(rows[0]);
    } catch (err) {
        logger.error('Error in /api/status/:id:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/stop', async (req, res) => {
    const { id } = req.body;
    if (!id) {
        return res.status(400).json({ error: 'ID is required.' });
    }
    try {
        await stopRecording(parseInt(id));
        res.status(200).json({ message: 'Recording stopped.', id });
    } catch (err) {
        logger.error('Error in /api/stop:', err);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/delete/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await deleteRecording(parseInt(id));
        res.status(200).json({ message: 'Recording deleted.', id });
    } catch (err) {
        logger.error('Error in /api/delete/:id:', err);
        res.status(500).json({ error: err.message });
    }
});

// Handling invalid routes
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found.' });
});

module.exports = app;

app.listen(port, () => {
    logger.info(`Server running on http://localhost:${port}`);
});
