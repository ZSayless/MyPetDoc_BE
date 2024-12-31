module.exports = async (connection) => {
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS pet_gallery_comments (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        is_deleted BIT(1) DEFAULT 0,
        content TEXT NOT NULL,
        user_id BIGINT NOT NULL,
        gallery_id BIGINT NOT NULL,
        parent_id BIGINT DEFAULT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (gallery_id) REFERENCES pet_gallery(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES pet_gallery_comments(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("Pet Gallery Comments table created successfully");
  } catch (error) {
    console.error("Error creating pet gallery comments table:", error);
    throw error;
  }
};
