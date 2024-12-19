module.exports = async (connection) => {
  try {
    await connection.query(`
      ALTER TABLE users 
      ADD COLUMN google_id VARCHAR(255) NULL,
      ADD COLUMN avatar VARCHAR(255) NULL;
    `);
    console.log("Added Google fields to users table successfully");
  } catch (error) {
    console.error("Error adding Google fields:", error);
    throw error;
  }
};
