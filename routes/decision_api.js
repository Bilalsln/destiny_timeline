const express = require("express");
const router = express.Router();
const db = require("../data/db");

function requireLoginApi(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.status(401).json({ error: "Login gerekli" });
}

router.get("/decision", requireLoginApi, async (req, res) => {
  try {
    const userId = req.session.user.id;

    const [rows] = await db.execute(
      "SELECT id, optionA, optionB, aiResult, createdAt FROM decision WHERE userId=? ORDER BY id DESC LIMIT 20",
      [userId]
    );

    res.json({ items: rows });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

router.post("/decision", requireLoginApi, async (req, res) => {
  const optionA = (req.body.optionA || "").trim();
  const optionB = (req.body.optionB || "").trim();

  if (optionA.length < 2 || optionB.length < 2) {
    return res.status(400).json({ error: "Seçenekler çok kısa." });
  }

  try {
    const userId = req.session.user.id;

    const aiResult = await getDecisionAdvice(optionA, optionB);

    await db.execute(
      "INSERT INTO decision (userId, optionA, optionB, aiResult) VALUES (?,?,?,?)",
      [userId, optionA, optionB, aiResult]
    );

    res.json({ ok: true, aiResult });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "AI/Sunucu hatası" });
  }
});

router.delete("/decision/:id", requireLoginApi, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const userId = req.session.user.id;

  if (!id) return res.status(400).json({ error: "Geçersiz id" });

  try {
    const [result] = await db.execute(
      "DELETE FROM decision WHERE id=? AND userId=?",
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

async function getDecisionAdvice(optionA, optionB) {
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
            "Sen karar yardımcısısın. İki seçenek verildiğinde Türkçe, kısa ve net şekilde karşılaştır. 3 madde artı/eksi, sonunda tek cümle öneri ver. 140 kelimeyi geçme.",
        },
        {
          role: "user",
          content: `Seçenek A: ${optionA}\nSeçenek B: ${optionB}\nHangisini seçmeliyim?`,
        },
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
