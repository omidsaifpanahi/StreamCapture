const request = require('supertest');
const app = require('../app');
const {
    startRecording,
    stopRecording,
    deleteRecording,
} = require('../modules/recorder');
const db = require('../db');

jest.mock('../modules/recorder');
jest.mock('../db');

describe('API endpoints', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('POST /api/start - should start recording', async () => {
        startRecording.mockResolvedValue({
            message: 'Recording started.',
            id: 1,
        });
        const res = await request(app)
            .post('/api/start')
            .send({ url: 'http://example.com', id: 1 })
            .expect(200);
        expect(res.body).toEqual({ message: 'Recording started.', id: 1 });
        expect(startRecording).toHaveBeenCalledWith('http://example.com', 1);
    });

    it('POST /api/start - should return 400 for missing URL', async () => {
        await request(app)
            .post('/api/start')
            .send({ id: 1 })
            .expect(400)
            .expect({ error: 'URL and ID are required.' });
    });

    it('POST /api/start - should return 400 for invalid ID', async () => {
        await request(app)
            .post('/api/start')
            .send({ url: 'http://example.com', id: 'abc' })
            .expect(400)
            .expect({ error: 'ID must be a positive number.' });
    });

    it('POST /api/start - should return 400 for invalid URL', async () => {
        await request(app)
            .post('/api/start')
            .send({ url: 'invalid-url', id: 1 })
            .expect(400)
            .expect({ error: 'Invalid URL format.' });
    });

    it('POST /api/start - should handle errors from startRecording', async () => {
        startRecording.mockRejectedValue(new Error('Recording failed'));
        await request(app)
            .post('/api/start')
            .send({ url: 'http://example.com', id: 1 })
            .expect(500)
            .expect({ error: 'Recording failed' });
    });

    it('GET /api/status/:id - should return recording status', async () => {
        db.select.mockResolvedValue([
            { id: 1, url: 'http://example.com', status: 'recording' },
        ]);
        const res = await request(app).get('/api/status/1').expect(200);
        expect(res.body).toEqual({
            id: 1,
            url: 'http://example.com',
            status: 'recording',
        });
        expect(db.select).toHaveBeenCalledWith(
            'SELECT * FROM recordings WHERE id = ?',
            [1],
        );
    });

    it('GET /api/status/:id - should return 404 if recording not found', async () => {
        db.select.mockResolvedValue([]);
        await request(app)
            .get('/api/status/1')
            .expect(404)
            .expect({ error: 'Recording not found.' });
    });

    it('POST /api/stop - should stop recording', async () => {
        const res = await request(app)
            .post('/api/stop')
            .send({ id: 1 })
            .expect(200);
        expect(res.body).toEqual({ message: 'Recording stopped.', id: 1 });
        expect(stopRecording).toHaveBeenCalledWith(1);
    });

    it('POST /api/stop - should return 400 if ID is missing', async () => {
        await request(app)
            .post('/api/stop')
            .send({})
            .expect(400)
            .expect({ error: 'ID is required.' });
    });

    it('POST /api/stop - should handle errors from stopRecording', async () => {
        stopRecording.mockRejectedValue(new Error('Stop recording failed'));
        await request(app)
            .post('/api/stop')
            .send({ id: 1 })
            .expect(500)
            .expect({ error: 'Stop recording failed' });
    });

    it('DELETE /api/delete/:id - should delete recording', async () => {
        const res = await request(app).delete('/api/delete/1').expect(200);
        expect(res.body).toEqual({ message: 'Recording deleted.', id: '1' });
        expect(deleteRecording).toHaveBeenCalledWith(1);
    });

    it('DELETE /api/delete/:id - should handle errors from deleteRecording', async () => {
        deleteRecording.mockRejectedValue(new Error('Delete recording failed'));
        await request(app)
            .delete('/api/delete/1')
            .expect(500)
            .expect({ error: 'Delete recording failed' });
    });

    it('should handle 404 for unknown routes', async () => {
        await request(app)
            .get('/unknown-route')
            .expect(404)
            .expect({ error: 'Route not found.' });
    });
});
