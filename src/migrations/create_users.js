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
        phone_number VARCHAR(10) NOT NULL,
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
        FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      CREATE TABLE IF NOT EXISTS pets (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        is_deleted BIT(1) DEFAULT 0,
        version BIGINT DEFAULT 1,
        user_id BIGINT NOT NULL,
        type ENUM('DOG', 'CAT', 'BIRD', 'RABBIT', 'FISH', 'HAMSTER', 'REPTILE', 'OTHER') NOT NULL,
        age INT,
        photo VARCHAR(255),
        notes TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("Users and Pets tables created successfully");
  } catch (error) {
    console.error("Error creating tables:", error);
    throw error;
  }
};

// alter table users drop column pet_notes;

// CREATE TABLE IF NOT EXISTS pets (
//         id BIGINT AUTO_INCREMENT PRIMARY KEY,
//         created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
//         updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
//         is_deleted BIT(1) DEFAULT 0,
//         version BIGINT DEFAULT 1,
//         user_id BIGINT NOT NULL,
//         type ENUM('DOG', 'CAT', 'BIRD', 'RABBIT', 'FISH', 'HAMSTER', 'REPTILE', 'OTHER') NOT NULL,
//         age INT,
//         photo VARCHAR(255),
//         notes TEXT,
//         FOREIGN KEY (user_id) REFERENCES users(id)
//       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
