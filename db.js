const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'videos.db');
const db = new sqlite3.Database(dbPath);

module.exports = {
    select: (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    },

    insert: (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.run(sql, params, function (err) {
                if (err) {
                    reject(
                        new Error(
                            `Error inserting data: ${err.message} (SQL: ${sql})`,
                        ),
                    );
                } else {
                    resolve({ id: this.lastID });
                }
            });
        });
    },

    update: (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.run(sql, params, function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ changes: this.changes });
                }
            });
        });
    },

    delete: (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.run(sql, params, function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ changes: this.changes });
                }
            });
        });
    },

    close: () => {
        return new Promise((resolve, reject) => {
            db.close((err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve('Database connection closed');
                }
            });
        });
    },
};

// create table recordings
// (
//     id     integer,
//     url    TEXT not null,
//     status TEXT default recording,
//     output TEXT not null,
//     error  TEXT
// );
