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
        phone_number VARCHAR(20) NOT NULL,
        password VARCHAR(255) NOT NULL,
        google_id VARCHAR(255) NULL,
        avatar VARCHAR(255) NULL,
        role ENUM('GENERAL_USER', 'HOSPITAL_ADMIN', 'ADMIN') NOT NULL,
        is_active BIT(1) DEFAULT 0,
        is_locked BIT(1) DEFAULT 0,
        verification_token VARCHAR(255),
        verification_expires DATETIME,
        reset_password_token VARCHAR(255),
        reset_password_expires DATETIME,
        hospital_id BIGINT NULL,
        pet_type ENUM('DOG', 'CAT', 'BIRD', 'RABBIT', 'FISH', 'HAMSTER', 'REPTILE', 'OTHER') NULL,
        pet_age INT NULL,
        pet_photo VARCHAR(255) NULL,
        pet_notes TEXT NULL,
        FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("Users table created successfully");
  } catch (error) {
    console.error("Error creating users table:", error);
    throw error;
  }
};
