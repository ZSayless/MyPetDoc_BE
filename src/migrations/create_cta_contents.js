module.exports = async (connection) => {
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS cta_contents (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        is_deleted BIT(1) DEFAULT 0,
        version BIGINT DEFAULT 1,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        link_url VARCHAR(255)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("CTA contents table created successfully");
  } catch (error) {
    console.error("Error creating CTA contents table:", error);
    throw error;
  }
};
