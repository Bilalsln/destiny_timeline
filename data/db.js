const { Sequelize } = require("sequelize");
require("dotenv").config();

let sequelize;

if (process.env.DATABASE_URL) {
 
  sequelize = new Sequelize(
    process.env.DATABASE_URL.replace("mysql://", "mysql2://"),
    {
      dialect: "mysql",
      logging: false,
    }
  );
} else {
  
  sequelize = new Sequelize(
    process.env.DB_DATABASE || "destiny_timeline",
    process.env.DB_USER || "root",
    process.env.DB_PASSWORD || "",
    {
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT) || 3306,
      dialect: "mysql",
      logging: false,
    }
  );
}

async function conn() {
  try {
    await sequelize.authenticate();
    console.log("Database connection successful");
  } catch (error) {
    console.error("Database connection failed:", error.message);
  }
}

conn();

module.exports = sequelize;
