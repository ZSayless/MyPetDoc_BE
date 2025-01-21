module.exports = async (connection) => {
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS hospitals (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        is_deleted BIT(1) DEFAULT 0,
        is_active BIT(1) DEFAULT 1,
        version BIGINT DEFAULT 1,
        address VARCHAR(255),
        phone VARCHAR(255),
        slug VARCHAR(255),
        email VARCHAR(255),
        link_website VARCHAR(255),
        map_location TEXT,
        description TEXT,
        name VARCHAR(150) NOT NULL,
        department VARCHAR(255),
        operating_hours VARCHAR(255),
        specialties VARCHAR(255),
        staff_description TEXT NULL,
        staff_credentials TEXT NULL,
        created_by BIGINT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("Hospitals table created successfully");
  } catch (error) {
    console.error("Error creating hospitals table:", error);
    throw error;
  }
};
