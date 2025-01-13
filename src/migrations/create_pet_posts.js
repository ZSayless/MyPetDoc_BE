module.exports = async (connection) => {
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS pet_posts (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        is_deleted BIT(1) DEFAULT 0,
        title VARCHAR(255) NOT NULL,
        version BIGINT DEFAULT 1,
        content TEXT NOT NULL,
        summary TEXT,
        featured_image VARCHAR(255),
        thumbnail_image VARCHAR(255),

        /* Post type */
        post_type ENUM('BLOG', 'NEWS', 'EVENT') NOT NULL,
        category VARCHAR(50),
        
        /* SEO and friendly URL */
        slug VARCHAR(255) UNIQUE,
        meta_title VARCHAR(255),
        meta_description TEXT,
        
        /* Post status */
        status ENUM('DRAFT', 'PENDING', 'PUBLISHED', 'ARCHIVED') DEFAULT 'DRAFT',
        published_at DATETIME,
        
        /* Event information */
        event_start_date DATETIME,
        event_end_date DATETIME,
        event_location VARCHAR(255),
        event_registration_link VARCHAR(255),
        is_featured BIT(1) DEFAULT 0,

        /* Statistics */
        views_count INT DEFAULT 0,
        likes_count INT DEFAULT 0,
        comments_count INT DEFAULT 0,
        shares_count INT DEFAULT 0,
        
        /* Links */
        author_id BIGINT,
        hospital_id BIGINT DEFAULT NULL,
        
        /* Tags and additional fields */
        tags VARCHAR(255) DEFAULT NULL,
        source VARCHAR(255) DEFAULT NULL,
        external_link VARCHAR(255) DEFAULT NULL,
        
        FOREIGN KEY (author_id) REFERENCES users(id),
        FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Create table for comments of the post
    await connection.query(`
      CREATE TABLE IF NOT EXISTS pet_post_comments (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        is_deleted BIT(1) DEFAULT 0,
        content TEXT NOT NULL,
        is_reported BIT(1) DEFAULT 0,
        user_id BIGINT NOT NULL,
        post_id BIGINT NOT NULL,
        parent_id BIGINT DEFAULT NULL,
        likes_count INT DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (post_id) REFERENCES pet_posts(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES pet_post_comments(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Create table for likes of the post
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

    console.log("Pet Posts and related tables created successfully");
  } catch (error) {
    console.error("Error creating pet posts tables:", error);
    throw error;
  }
};
