module.exports = async (connection) => {
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS blog_posts (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        is_deleted BIT(1) DEFAULT 0,
        version BIGINT DEFAULT 1,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        summary TEXT,
        slug VARCHAR(255) UNIQUE,
        featured_image VARCHAR(255),
        published_at DATETIME,
        is_published BIT(1) DEFAULT 0,
        views_count INT DEFAULT 0,
        author_id BIGINT,
        FOREIGN KEY (author_id) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("Blog Posts table created successfully");
  } catch (error) {
    console.error("Error creating blog posts table:", error);
    throw error;
  }
};
