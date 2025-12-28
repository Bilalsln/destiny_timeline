const express = require("express");
const router = express.Router();
const db = require("../data/db");

function requireLoginApi(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.status(401).json({ error: "Login gerekli" });
}

router.get("/advisor", requireLoginApi, async (req, res) => {
  try {
    const userId = req.session.user.id;

    const [rows] = await db.execute(
      "SELECT id, question, aiAnswer, createdAt FROM advisor WHERE userId=? ORDER BY id DESC LIMIT 20",
      [userId]
    );

    res.json({ items: rows });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

router.post("/advisor", requireLoginApi, async (req, res) => {
  const question = (req.body.question || "").trim();
  if (question.length < 5) {
    return res.status(400).json({ error: "Soru çok kısa." });
  }

  try {
    const userId = req.session.user.id;

    const aiAnswer = await getAdvisorAnswer(question);

    await db.execute(
      "INSERT INTO advisor (userId, question, aiAnswer) VALUES (?,?,?)",
      [userId, question, aiAnswer]
    );

    res.json({ ok: true, aiAnswer });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "AI/Sunucu hatası" });
  }
});

router.delete("/advisor/:id", requireLoginApi, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const userId = req.session.user.id;

  if (!id) return res.status(400).json({ error: "Geçersiz id" });

  try {
    const [result] = await db.execute(
      "DELETE FROM advisor WHERE id=? AND userId=?",
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Kayıt bulunamadı" });
    }

    res.json({ ok: true });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Silme hatası" });
  }
});

async function getAdvisorAnswer(question) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return "OPENAI_API_KEY bulunamadı (.env kontrol et).";

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Sen 'kişisel danışman'sın. Kullanıcının sorusuna Türkçe, kısa, net ve yargılamadan cevap ver. 3 maddelik öneri yap. 120 kelimeyi geçme.",
        },
        { role: "user", content: question },
      ],
      temperature: 0.7,
    }),
  });

  if (!resp.ok) {
    const t = await resp.text();
    return (`AI hatası: ${t}`).slice(0, 300);
  }

  const data = await resp.json();
  if (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
    return data.choices[0].message.content.trim();
  }
  return "AI cevap üretmedi.";
}

module.exports = router;
