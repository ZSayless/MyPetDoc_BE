module.exports = async (connection) => {
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS hospital_image_likes (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        image_id BIGINT NOT NULL,
        user_id BIGINT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (image_id) REFERENCES hospital_images(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_like (image_id, user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("Hospital image likes table created successfully");
  } catch (error) {
    console.error("Error creating hospital image likes table:", error);
    throw error;
  }
}; 