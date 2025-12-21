const express = require("express");
const path = require("path");
const session = require("express-session");
require("dotenv").config();

const app = express();


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


app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "login.html"));
});

app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "register.html"));
});


app.get("/", requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "index.html"));
});

app.get("/diary", requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "diary.html"));
});

app.get("/ai", requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "ai.html"));
});

app.get("/diary-ai", requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "diary-ai.html"));
});


app.use((req, res) => {
  res.status(404).send("404 - Sayfa bulunamadı");
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`${PORT} portu dinlemede`);
});
