module.exports = async (connection) => {
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS pet_gallery (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        is_deleted BIT(1) DEFAULT 0,
        image_url VARCHAR(255) NOT NULL,
        caption TEXT NOT NULL,
        slug VARCHAR(255) NOT NULL,
        description TEXT,
        likes_count INT DEFAULT 0,
        comments_count INT DEFAULT 0,
        user_id BIGINT NULL,
        pet_type VARCHAR(50),
        tags VARCHAR(255),
        FOREIGN KEY (user_id) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("Pet Gallery table created successfully");
  } catch (error) {
    console.error("Error creating pet gallery table:", error);
    throw error;
  }
};
