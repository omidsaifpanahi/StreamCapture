module.exports = {
    apps: [
        {
            name: 'app',
            script: './app.js',
            instance_var: 'INSTANCE_ID',
            instances: 1,
            exec_mode: 'cluster',
            env: {
                SERVER_PORT: 3003,
                NODE_ENV: 'development',
            },
        },
    ],
};
