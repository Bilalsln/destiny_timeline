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

const authApiRoutes = require("./routes/auth_api");
app.use("/api", authApiRoutes);

const diaryAiApiRoutes = require("./routes/diary_ai_api");
app.use("/api", diaryAiApiRoutes);

const advisorAiApiRoutes = require("./routes/advisor_ai_api");
app.use("/api", advisorAiApiRoutes);

const decisionAiApiRoutes = require("./routes/decision_ai_api");
app.use("/api", decisionAiApiRoutes);

const moodApiRoutes = require("./routes/mood_api");
app.use("/api", moodApiRoutes);

const musicAiApiRoutes = require("./routes/music_ai_api");
app.use("/api", musicAiApiRoutes);

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/", requireLogin, (req, res) => {
  res.render("index");
});

app.get("/diary", requireLogin, (req, res) => {
  res.render("advisor");
});

app.get("/ai", requireLogin, (req, res) => {
  res.render("decision");
});

app.get("/diary-ai", requireLogin, (req, res) => {
  res.render("diary_ai");
});

app.get("/tools", requireLogin, (req, res) => {
  res.render("tools");
});

app.get("/tools/mood", requireLogin, (req, res) => {
  res.render("tools_mood");
});

app.get("/tools/budget-travel", requireLogin, (req, res) => {
  res.render("tools_travel");
});

app.get("/tools/music", requireLogin, (req, res) => {
  res.render("tools_music");
});

app.use((req, res) => {
  res.status(404).send("404 - Sayfa bulunamadı");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`${PORT} portu dinlemede`);
});
