const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();
const db = require("../data/db");


router.post("/auth/register", async (req, res) => {
  const fullName = (req.body.fullName || "").trim();
  const email = (req.body.email || "").trim().toLowerCase();
  const password = req.body.password || "";

  if (!fullName || !email || !password) {
    return res.status(400).json({ error: "Tüm alanlar zorunlu." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Şifre en az 6 karakter olmalı." });
  }

  try {
    const [exists] = await db.execute("SELECT id FROM users WHERE email=?", [email]);
    if (exists.length > 0) {
      return res.status(409).json({ error: "Bu e-posta zaten kayıtlı." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await db.execute(
      "INSERT INTO users (fullName, email, passwordHash) VALUES (?,?,?)",
      [fullName, email, passwordHash]
    );

    res.json({ ok: true });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});


router.post("/auth/login", async (req, res) => {
  const email = (req.body.email || "").trim().toLowerCase();
  const password = req.body.password || "";

  if (!email || !password) {
    return res.status(400).json({ error: "E-posta ve şifre zorunlu." });
  }

  try {
    const [rows] = await db.execute(
      "SELECT id, fullName, email, passwordHash FROM users WHERE email=?",
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "E-posta veya şifre yanlış." });
    }

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "E-posta veya şifre yanlış." });
    }

    
    req.session.user = { id: user.id, fullName: user.fullName, email: user.email };

    res.json({ ok: true, user: req.session.user });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});


router.get("/auth/me", (req, res) => {
  res.json({ user: req.session.user || null });
});


router.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

module.exports = router;
