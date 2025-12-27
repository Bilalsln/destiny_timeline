const express = require("express");
const router = express.Router();
const db = require("../data/db");

function requireLoginApi(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.status(401).json({ error: "Login gerekli" });
}

router.get("/diary-ai", requireLoginApi, async (req, res) => {
  try {
    const userId = req.session.user.id;

    const [rows] = await db.execute(
      "SELECT id, diaryText, aiAdvice, createdAt FROM diary_ai WHERE userId=? ORDER BY id DESC LIMIT 20",
      [userId]
    );

    res.json({ items: rows });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

router.post("/diary-ai", requireLoginApi, async (req, res) => {
  const diaryText = (req.body.diaryText || "").trim();
  if (diaryText.length < 10) {
    return res.status(400).json({ error: "Günlük çok kısa." });
  }

  try {
    const userId = req.session.user.id;

    const aiAdvice = await getAdviceFromOpenAI(diaryText);

    await db.execute(
      "INSERT INTO diary_ai (userId, diaryText, aiAdvice) VALUES (?,?,?)",
      [userId, diaryText, aiAdvice]
    );

    res.json({ ok: true, aiAdvice });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "AI/Sunucu hatası" });
  }
});

router.delete("/diary-ai/:id", requireLoginApi, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const userId = req.session.user.id;

  if (!id) {
    return res.status(400).json({ error: "Geçersiz id" });
  }

  try {
    const [result] = await db.execute(
      "DELETE FROM diary_ai WHERE id=? AND userId=?",
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

async function getAdviceFromOpenAI(diaryText) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return "OPENAI_API_KEY bulunamadı (.env kontrol et).";
  }

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Sen bir koçsun. Kullanıcının günlüğünü okuyup kısa, net, yargılamayan 3 maddelik tavsiye ver. Türkçe yaz. 120 kelimeyi geçme."
        },
        { role: "user", content: diaryText }
      ],
      temperature: 0.7
    })
  });

  if (!resp.ok) {
    const t = await resp.text();
    return `AI hatası: ${t}`.slice(0, 300);
  }

  const data = await resp.json();
  const text = data?.choices?.[0]?.message?.content?.trim();
  return text || "AI cevap üretmedi.";
}

module.exports = router;
