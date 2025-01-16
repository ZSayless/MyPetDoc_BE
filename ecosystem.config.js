module.exports = {
  apps: [
    {
      name: "pet-hospital-api",
      script: "./src/index.js",
      instances: 2,
      exec_mode: "cluster",
      max_memory_restart: "200M",
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
