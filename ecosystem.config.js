module.exports = {
  apps: [
    {
      name: 'school-manager',
      script: './backend/src/server.js',
      cwd: __dirname,
      instances: 'max',           // Use all available CPU cores
      exec_mode: 'cluster',       // Cluster mode for load balancing
      env: {
        NODE_ENV: 'development',
        PORT: 5000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/error.log',
      out_file: './logs/output.log',
      merge_logs: true,
      // Restart policy
      max_memory_restart: '500M',
      restart_delay: 5000,
      max_restarts: 10,
      // Watch (disabled in production)
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'uploads', 'frontend'],
    },
  ],
};

