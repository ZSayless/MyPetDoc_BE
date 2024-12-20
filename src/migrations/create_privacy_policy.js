module.exports = async (connection) => {
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS privacy_policy (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        is_deleted BIT(1) DEFAULT 0,
        version BIGINT DEFAULT 1,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        effective_date DATE NOT NULL,
        last_updated_by BIGINT,
        FOREIGN KEY (last_updated_by) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("Privacy Policy table created successfully");
  } catch (error) {
    console.error("Error creating privacy policy table:", error);
    throw error;
  }
};
