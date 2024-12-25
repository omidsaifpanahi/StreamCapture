const { isRecordingUrl } = require('../modules/recorder');
const db = require('../db');

jest.mock('../db');

describe('Recorder helper functions', () => {
    it('should return true if URL is being recorded', async () => {
        db.select.mockResolvedValue([{ id: 1 }]);
        const result = await isRecordingUrl('test.com');
        expect(result).toBe(true);
    });

    it('should return false if URL is not being recorded', async () => {
        db.select.mockResolvedValue([]);
        const result = await isRecordingUrl('test.com');
        expect(result).toBe(false);
    });
});
