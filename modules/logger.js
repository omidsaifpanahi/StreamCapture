const { createLogger, format, transports } = require('winston');
require('winston-daily-rotate-file');


const logDirectory = process.env.LOG_DIR || './logs/';


const transport = new transports.DailyRotateFile({
    filename: `${logDirectory}%DATE%.log`,
    datePattern: 'YYYY-MM-DD',
    maxFiles: '30d',
});

transport.on('error', (err) => {
    console.error('Error occurred in logging:', err);
});


const logFormat = format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(
        ({ timestamp, level, message }) =>
            `${timestamp} - [${level.toUpperCase()}] : ${message}`,
    ),
);


const isProduction = process.env.NODE_ENV === 'production';


const logger = createLogger({
    format: logFormat,
    transports: [
        transport,
        ...(isProduction ? [] : [new transports.Console()]),
    ],
    exitOnError: false,
});

logger.stream = {
    write: function (message) {
        const [level, ...msgParts] = message.trim().split(' - ');
        const msg = msgParts.join(' - ');

        if (['debug', 'info', 'warn', 'error'].includes(level.toLowerCase())) {
            logger[level.toLowerCase()](msg);
        } else {
            logger.info(message.trim());
        }
    },
};

module.exports = logger;
