const db = require('../db');
const sqlite3 = require('sqlite3').verbose();

describe('Database operations', () => {
    let testDb;

    beforeEach(async () => {
        testDb = new sqlite3.Database('memory.db');
        db.setDb(testDb);
        await db.run(
            'CREATE TABLE recordings (id INTEGER PRIMARY KEY, url TEXT, status TEXT, output TEXT)',
        );
    });

    afterEach(async () => {
        await db.close();
    });

    it('should insert a new recording', async () => {
        const result = await db.insert(
            'INSERT INTO recordings (url, status, output) VALUES (?, ?, ?)',
            ['test.com', 'pending', 'test.mp4'],
        );
        expect(result.id).toBe(1);
    });

    it('should select recordings', async () => {
        await db.insert(
            'INSERT INTO recordings (url, status, output) VALUES (?, ?, ?)',
            ['test.com', 'pending', 'test.mp4'],
        );
        const rows = await db.select('SELECT * FROM recordings');
        expect(rows.length).toBe(1);
        expect(rows[0].url).toBe('test.com');
    });
});
