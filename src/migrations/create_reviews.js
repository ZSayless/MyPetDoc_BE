module.exports = async (connection) => {
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        is_deleted BIT(1) DEFAULT 0,
        version BIGINT DEFAULT 1,
        comment TEXT,
        is_reported BIT(1) DEFAULT 0,
        rating INT,
        reply TEXT,
        hospital_id BIGINT,
        user_id BIGINT,
        FOREIGN KEY (hospital_id) REFERENCES hospitals(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("Reviews table created successfully");
  } catch (error) {
    console.error("Error creating reviews table:", error);
    throw error;
  }
};
