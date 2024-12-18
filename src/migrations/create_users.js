module.exports = async (connection) => {
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        is_deleted BIT(1) DEFAULT 0,
        version BIGINT DEFAULT 1,
        email VARCHAR(100) UNIQUE NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('GENERAL_USER', 'HOSPITAL_ADMIN') NOT NULL,
        is_active BIT(1) DEFAULT 1,
        is_locked BIT(1) DEFAULT 0
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("Users table created successfully");
  } catch (error) {
    console.error("Error creating users table:", error);
    throw error;
  }
};
