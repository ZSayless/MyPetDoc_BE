module.exports = {
  apps: [
    {
      name: "mypetdoc-api",
      script: "./src/index.js",
      instances: 2,
      exec_mode: "cluster",
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      restart_delay: 4000,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      max_logs: "10",
      log_file: "logs/app.log",
      max_restarts: 10,
      min_uptime: "30s",
      listen_timeout: 8000,
      kill_timeout: 3000,
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      // Thêm error file riêng
      error_file: "logs/error.log",
      out_file: "logs/out.log",
    },
  ],
};
