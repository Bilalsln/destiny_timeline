const mysql = require("mysql2");
const config = require("../config");

let connection = mysql.createConnection(config.db);

connection.connect((err) => {
  if (err) {
    console.log("MySQL bağlantı hatası:", err.message);
    return;
  }
  console.log("MySQL bağlantısı başarılı");
});

module.exports = connection.promise();
