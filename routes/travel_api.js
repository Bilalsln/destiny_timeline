const express = require("express");
const router = express.Router();
const db = require("../data/db");

function requireLoginApi(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.status(401).json({ error: "Giriş gerekli" });
}

router.post("/travel", requireLoginApi, async (req, res) => {
  const travelType = (req.body.travelType || "").trim();
  const withWho = (req.body.withWho || "").trim();
  const duration = (req.body.duration || "").trim();
  const minBudget = (req.body.minBudget || "").trim();
  const maxBudget = (req.body.maxBudget || "").trim();
  const extraDetails = (req.body.extraDetails || "").trim();
  const moodHistoryId = req.body.moodHistoryId || "";

  if (!travelType || !withWho || !duration || !minBudget || !maxBudget) {
    return res.status(400).json({ error: "Lütfen tüm zorunlu alanları doldurun." });
  }

  try {
    let moodHistoryData = null;
    if (moodHistoryId) {
      moodHistoryData = await getMoodHistoryById(req.session.user.id, moodHistoryId);
    }

    const suggestion = await getTravelSuggestion(travelType, withWho, duration, minBudget, maxBudget, extraDetails, moodHistoryData);
    res.json({ suggestion });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "AI/Sunucu hatası" });
  }
});

async function getMoodHistoryById(userId, historyId) {
  try {
    const [rows] = await db.execute(
      "SELECT mood_label, advice, mini_task FROM moods WHERE id=? AND user_id=?",
      [historyId, userId]
    );
    if (rows.length > 0) {
      return rows[0];
    }
  } catch (err) {
    console.log("Ruh hali geçmişi okuma hatası:", err);
  }
  return null;
}

async function getTravelSuggestion(travelType, withWho, duration, minBudget, maxBudget, extraDetails, moodHistoryData) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return "API Key eksik.";

  let userMessage = `Tatil Türü: ${travelType}\nKiminle: ${withWho}\nSüre: ${duration}\nBütçe: ${minBudget} - ${maxBudget} TL\n`;
  
  if (extraDetails) {
    userMessage += `Ekstra Detaylar: ${extraDetails}\n`;
  }
  
  if (moodHistoryData) {
    userMessage += `\nKullanıcının geçmiş ruh hali analizi:\n`;
    userMessage += `- Ruh Hali: ${moodHistoryData.mood_label}\n`;
    userMessage += `- Tavsiye: ${moodHistoryData.advice}\n`;
    userMessage += `- Mini Görev: ${moodHistoryData.mini_task}\n`;
    userMessage += `Bu geçmiş analizi de dikkate alarak tatil öner.\n`;
  }
  
  userMessage += `Bana uygun bir tatil planı öner. Şehir/yer öner, aktiviteler, konaklama tavsiyeleri ve bütçe dağılımı ver. Türkçe cevap ver.`;

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
          content: "Sen bir seyahat danışmanısın. Kullanıcının tercihlerine göre detaylı bir tatil planı hazırla. Şehir/yer öner, aktiviteler, konaklama ve bütçe dağılımı ver. Türkçe cevap ver."
        },
        {
          role: "user",
          content: userMessage
        }
      ],
      temperature: 0.8
    })
  });

  if (!resp.ok) {
    const t = await resp.text();
    return `Hata: ${t}`;
  }

  const data = await resp.json();
  if (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
    return data.choices[0].message.content.trim();
  }
  return "Öneri bulunamadı.";
}

module.exports = router;