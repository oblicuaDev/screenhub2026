module.exports = {
  apps: [
    {
      name: 'screenhub-api',
      script: 'server/src/index.js',
      cwd: '/opt/screenhub',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'development',
        PORT: 4000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
      log_file: '/var/log/screenhub/combined.log',
      out_file: '/var/log/screenhub/out.log',
      error_file: '/var/log/screenhub/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
