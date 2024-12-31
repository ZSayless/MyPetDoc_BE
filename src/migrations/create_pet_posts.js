module.exports = async (connection) => {
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS pet_posts (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        is_deleted BIT(1) DEFAULT 0,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        summary TEXT,
        featured_image VARCHAR(255),
        thumbnail_image VARCHAR(255),
        
        /* Phân loại bài viết */
        post_type ENUM('BLOG', 'NEWS', 'EVENT') NOT NULL,
        category VARCHAR(50),
        
        /* SEO và URL thân thiện */
        slug VARCHAR(255) UNIQUE,
        meta_title VARCHAR(255),
        meta_description TEXT,
        
        /* Trạng thái bài viết */
        status ENUM('DRAFT', 'PENDING', 'PUBLISHED', 'ARCHIVED') DEFAULT 'DRAFT',
        published_at DATETIME,
        
        /* Thông tin sự kiện */
        event_start_date DATETIME,
        event_end_date DATETIME,
        event_location VARCHAR(255),
        event_registration_link VARCHAR(255),
        is_featured BIT(1) DEFAULT 0,
        
        /* Thống kê tương tác */
        views_count INT DEFAULT 0,
        likes_count INT DEFAULT 0,
        comments_count INT DEFAULT 0,
        shares_count INT DEFAULT 0,
        
        /* Liên kết */
        author_id BIGINT,
        hospital_id BIGINT,
        
        /* Tags và các trường bổ sung */
        tags VARCHAR(255),
        source VARCHAR(255),
        external_link VARCHAR(255),
        
        FOREIGN KEY (author_id) REFERENCES users(id),
        FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Tạo bảng cho comments của bài viết
    await connection.query(`
      CREATE TABLE IF NOT EXISTS pet_post_comments (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        is_deleted BIT(1) DEFAULT 0,
        content TEXT NOT NULL,
        user_id BIGINT NOT NULL,
        post_id BIGINT NOT NULL,
        parent_id BIGINT DEFAULT NULL,
        likes_count INT DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (post_id) REFERENCES pet_posts(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES pet_post_comments(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Tạo bảng cho likes của bài viết
    await connection.query(`
      CREATE TABLE IF NOT EXISTS pet_post_likes (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        user_id BIGINT NOT NULL,
        post_id BIGINT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (post_id) REFERENCES pet_posts(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_post_like (user_id, post_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Tạo bảng cho media của bài viết
    await connection.query(`
      CREATE TABLE IF NOT EXISTS pet_post_media (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        post_id BIGINT NOT NULL,
        media_type ENUM('IMAGE', 'VIDEO', 'DOCUMENT') NOT NULL,
        media_url VARCHAR(255) NOT NULL,
        caption TEXT,
        display_order INT DEFAULT 0,
        FOREIGN KEY (post_id) REFERENCES pet_posts(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log("Pet Posts and related tables created successfully");
  } catch (error) {
    console.error("Error creating pet posts tables:", error);
    throw error;
  }
};
