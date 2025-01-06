module.exports = async (connection) => {
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS report_reasons (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        reason TEXT NOT NULL,
        resolved BIT(1) DEFAULT 0,
        reported_by BIGINT,
        review_id BIGINT,
        pet_gallery_comment_id BIGINT,
        pet_post_comment_id BIGINT,
        FOREIGN KEY (reported_by) REFERENCES users(id),
        FOREIGN KEY (review_id) REFERENCES reviews(id),
        FOREIGN KEY (pet_gallery_comment_id) REFERENCES pet_gallery_comments(id),
        FOREIGN KEY (pet_post_comment_id) REFERENCES pet_post_comments(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("Report reasons table created successfully");
  } catch (error) {
    console.error("Error creating report reasons table:", error);
    throw error;
  }
};
