const { Sequelize } = require("sequelize");
require("dotenv").config();

const sequelize = new Sequelize(
  process.env.DB_DATABASE || "destiny_timeline",
  process.env.DB_USER || "root",
  process.env.DB_PASSWORD || "Bsulun1313",
  {
    host: process.env.DB_HOST || "localhost",
    dialect: "mysql"
  }
);

async function conn() {
  try {
    await sequelize.authenticate();
    console.log("Connection has been established successfully.");
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }
}

conn();

async function execute(sql, params = []) {
  const [rows, meta] = await sequelize.query(sql, {
    replacements: params
  });
  return [rows, meta];
}

module.exports = {
  sequelize,
  execute
};
