const express = require("express");
const router = express.Router();
const db = require("../data/db");

function requireLoginApi(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.status(401).json({ error: "Giriş gerekli" });
}

router.post("/outfit", requireLoginApi, async (req, res) => {
  const gender = (req.body.gender || "").trim();
  const mood = (req.body.mood || "").trim();
  const weather = (req.body.weather || "").trim();
  const activity = (req.body.activity || "").trim();
  const moodHistoryId = req.body.moodHistoryId || "";

  if (!gender || !mood || !weather) {
    return res.status(400).json({ error: "Lütfen cinsiyet, ruh hali ve hava durumu seçin." });
  }

  try {
    let moodHistoryData = null;
    if (moodHistoryId) {
      moodHistoryData = await getMoodHistoryById(req.session.user.id, moodHistoryId);
    }

    const result = await getOutfitSuggestion(gender, mood, weather, activity, moodHistoryData);
    const imageUrl = await findOutfitImage(result.outfit, gender);
    res.json({ outfit: result.outfit, reason: result.reason, imageUrl });
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

async function getOutfitSuggestion(gender, mood, weather, activity, moodHistoryData) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { outfit: "API Key eksik.", reason: "" };

  let userMessage = `Cinsiyet: ${gender}\nRuh Hali: ${mood}\nHava Durumu: ${weather}\n`;
  
  if (activity) {
    userMessage += `Aktivite: ${activity}\n`;
  }
  
  if (moodHistoryData) {
    userMessage += `\nKullanıcının geçmiş ruh hali analizi:\n`;
    userMessage += `- Ruh Hali: ${moodHistoryData.mood_label}\n`;
    userMessage += `- Tavsiye: ${moodHistoryData.advice}\n`;
    userMessage += `- Mini Görev: ${moodHistoryData.mini_task}\n`;
    userMessage += `Bu geçmiş analizi de dikkate alarak kıyafet öner.\n`;
  }
  
  userMessage += `Bana uygun bir kıyafet öner. Format: 'Kıyafet kombinasyonu'. Altına da tek cümlelik nedenini yaz. Kıyafet önerisinde İngilizce kıyafet isimleri kullan (örnek: t-shirt, jeans, jacket, dress, sneakers). Türkçe cevap ver.`;

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
          content: "Sen bir stil danışmanısın. Kullanıcının cinsiyetine, ruh haline, hava durumuna ve aktivitesine göre uygun kıyafet öner. Format: 'Kıyafet kombinasyonu'. Kıyafet isimlerini İngilizce yaz (t-shirt, jeans, jacket, dress, sneakers gibi). Altına da tek cümlelik nedenini yaz. Türkçe cevap ver."
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
    return { outfit: `Hata: ${t}`, reason: "" };
  }

  const data = await resp.json();
  let content = "Öneri bulunamadı.";
  if (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
    content = data.choices[0].message.content.trim();
  }
  
  const lines = content.split("\n");
  const outfit = lines[0] || content;
  const reason = lines.slice(1).join(" ").trim() || "";

  return { outfit, reason };
}

async function findOutfitImage(outfitText, gender) {
  try {
    const apiKey = process.env.UNSPLASH_ACCESS_KEY;
    if (!apiKey) {
      console.log("Unsplash API key bulunamadı");
      return null;
    }

    const searchQuery = encodeURIComponent(outfitText + " " + gender + " outfit");
    const unsplashUrl = `https://api.unsplash.com/search/photos?query=${searchQuery}&per_page=3`;

    const resp = await fetch(unsplashUrl, {
      headers: {
        "Authorization": `Client-ID ${apiKey}`
      }
    });

    if (!resp.ok) {
      console.log("Unsplash API hatası:", resp.status);
      return null;
    }

    const data = await resp.json();
    if (data.results && data.results.length > 0) {
      return data.results[0].urls.regular;
    }
  } catch (err) {
    console.log("Fotoğraf bulma hatası:", err);
  }
  
  return null;
}

module.exports = router;
