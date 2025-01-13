module.exports = async (connection) => {
  try {
    // Add foreign key for hospitals.created_by
    await connection.query(`
      ALTER TABLE hospitals
      ADD CONSTRAINT fk_hospitals_created_by
      FOREIGN KEY (created_by) REFERENCES users(id);
    `);

    // Add foreign key for users.hospital_id
    await connection.query(`
      ALTER TABLE users
      ADD CONSTRAINT fk_users_hospital
      FOREIGN KEY (hospital_id) REFERENCES hospitals(id);
    `);

    console.log("Foreign keys added successfully");
  } catch (error) {
    console.error("Error adding foreign keys:", error);
    throw error;
  }
};
