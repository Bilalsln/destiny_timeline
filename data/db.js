const { Sequelize } = require("sequelize");
require("dotenv").config();

let sequelize;

const baseOptions = {
  dialect: "mysql",
  logging: false,
};

const tlsOptions = {
  ...baseOptions,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
};

if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, tlsOptions);
} else {
  const sslRequired = process.env.DB_SSL === "true" || 
                       process.env.DB_HOST?.includes("railway") || 
                       process.env.DB_HOST?.includes("render") ||
                       process.env.DB_HOST?.includes("tidb");
  
  sequelize = new Sequelize(
    process.env.DB_DATABASE || "destiny_timeline",
    process.env.DB_USER || "root",
    process.env.DB_PASSWORD || "",
    {
      ...baseOptions,
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT) || 3306,
      ...(sslRequired ? { dialectOptions: { ssl: { require: true, rejectUnauthorized: false } } } : {})
    }
  );
}

async function execute(sql, params = []) {
  const [rows, meta] = await sequelize.query(sql, { replacements: params });
  return [rows, meta];
}

module.exports = { sequelize, execute };
