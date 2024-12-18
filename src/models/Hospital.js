const db = require("../config/db");

const Hospital = {
  tableName: "hospitals",

  fields: {
    id: "BIGINT",
    created_at: "DATETIME",
    is_deleted: "BIT",
    updated_at: "DATETIME",
    version: "BIGINT",
    address: "VARCHAR(255)",
    contact: "VARCHAR(255)",
    department: "VARCHAR(255)",
    map_location: "VARCHAR(255)",
    name: "VARCHAR(150)",
    operating_hours: "VARCHAR(255)",
    specialties: "VARCHAR(255)",
    created_by: "BIGINT",
  },

  create: function (hospitalData) {
    return new Promise((resolve, reject) => {
      db.query("INSERT INTO hospitals SET ?", hospitalData, (err, result) => {
        if (err) reject(err);
        resolve(result);
      });
    });
  },

  findById: function (id) {
    return new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM hospitals WHERE id = ? AND is_deleted = 0",
        [id],
        (err, result) => {
          if (err) reject(err);
          resolve(result[0]);
        }
      );
    });
  },
};

module.exports = Hospital;
