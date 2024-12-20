module.exports = async (connection) => {
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS about_us (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        is_deleted BIT(1) DEFAULT 0,
        version BIGINT DEFAULT 1,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        mission TEXT,
        vision TEXT,
        core_values TEXT,
        team_description TEXT,
        banner_image VARCHAR(255),
        last_updated_by BIGINT,
        FOREIGN KEY (last_updated_by) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("About Us table created successfully");
  } catch (error) {
    console.error("Error creating about us table:", error);
    throw error;
  }
};
