const express = require("express");
const path = require("path");
const session = require("express-session");
require("dotenv").config();

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "destiny_timeline_secret",
    resave: false,
    saveUninitialized: false,
  })
);

app.use("/static", express.static(path.join(__dirname, "public")));

function requireLogin(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.redirect("/login");
}


const sequelize = require("./data/db");


require("./models/User");


(async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connection successful");

    await sequelize.sync(); // ✅ tabloları otomatik oluşturur
    console.log("✅ Database synced");

  } catch (err) {
    console.log("❌ DB init error:", err.message);
  }
})();


const authApiRoutes = require("./routes/auth_api");
app.use("/api", authApiRoutes);

const diaryApiRoutes = require("./routes/diary_api");
app.use("/api", diaryApiRoutes);

const advisorApiRoutes = require("./routes/advisor_api");
app.use("/api", advisorApiRoutes);

const decisionApiRoutes = require("./routes/decision_api");
app.use("/api", decisionApiRoutes);

const moodApiRoutes = require("./routes/mood_api");
app.use("/api", moodApiRoutes);

const musicAiApiRoutes = require("./routes/music_ai_api");
app.use("/api", musicAiApiRoutes);

const outfitApiRoutes = require("./routes/outfit_api");
app.use("/api", outfitApiRoutes);

const travelApiRoutes = require("./routes/travel_api");
app.use("/api", travelApiRoutes);


(async () => {
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS music_ai (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        mood VARCHAR(100),
        genre VARCHAR(100),
        song_name TEXT,
        reason TEXT,
        youtube_link TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("✅ music_ai table ensured");
  } catch (err) {
    console.log("❌ Tablo oluşturma hatası:", err.message);
  }
})();

app.get("/login", (req, res) => res.render("login"));
app.get("/register", (req, res) => res.render("register"));

app.get("/", requireLogin, (req, res) => res.render("index"));
app.get("/advisor", requireLogin, (req, res) => res.render("advisor"));
app.get("/decision", requireLogin, (req, res) => res.render("decision"));
app.get("/diary", requireLogin, (req, res) => res.render("diary"));

app.get("/tools/mood", requireLogin, (req, res) => res.render("tools_mood"));
app.get("/tools/travel", requireLogin, (req, res) => res.render("tools_travel"));
app.get("/tools/music", requireLogin, (req, res) => res.render("tools_music"));
app.get("/tools/outfit", requireLogin, (req, res) => res.render("tools_outfit"));

app.use((req, res) => {
  res.status(404).send("404 - Sayfa bulunamadı");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`${PORT} portu dinlemede`);
});
