module.exports = async (connection) => {
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS hospital_images (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        hospital_id BIGINT NOT NULL,
        image_url VARCHAR(255) NOT NULL,
        created_by BIGINT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("Hospital images table created successfully");
  } catch (error) {
    console.error("Error creating hospital images table:", error);
    throw error;
  }
};
