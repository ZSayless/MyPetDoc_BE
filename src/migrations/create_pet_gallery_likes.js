module.exports = async (connection) => {
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS pet_gallery_likes (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        user_id BIGINT NOT NULL,
        gallery_id BIGINT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (gallery_id) REFERENCES pet_gallery(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_gallery_like (user_id, gallery_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("Pet Gallery Likes table created successfully");
  } catch (error) {
    console.error("Error creating pet gallery likes table:", error);
    throw error;
  }
};
