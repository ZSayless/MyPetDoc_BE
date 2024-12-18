module.exports = async (connection) => {
  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`
    );
    await connection.query(`USE ${process.env.DB_NAME}`);
    console.log("Database created successfully");
  } catch (error) {
    console.error("Error creating database:", error);
  }
};
