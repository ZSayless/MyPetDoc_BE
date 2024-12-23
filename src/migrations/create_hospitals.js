module.exports = async (connection) => {
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS hospitals (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        is_deleted BIT(1) DEFAULT 0,
        version BIGINT DEFAULT 1,
        address VARCHAR(255),
        contact VARCHAR(255),
        map_location VARCHAR(255),
        description TEXT,
        image VARCHAR(255),
        name VARCHAR(150) NOT NULL,
        department VARCHAR(255),
        operating_hours VARCHAR(255),
        specialties VARCHAR(255),
        created_by BIGINT,
        FOREIGN KEY (created_by) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("Hospitals table created successfully");
  } catch (error) {
    console.error("Error creating hospitals table:", error);
    throw error;
  }
};
