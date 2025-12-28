const express = require("express");
const router = express.Router();
const db = require("../data/db");

function requireLoginApi(req, res, next) {
    if (req.session && req.session.user) return next();
    return res.status(401).json({ error: "Giriş gerekli" });
}

router.post("/music-ai", requireLoginApi, async (req, res) => {
    const mood = (req.body.mood || "").trim();
    const genre = (req.body.genre || "").trim();
    const moodHistoryId = req.body.moodHistoryId || "";
    const extraDetails = (req.body.extraDetails || "").trim();

    if (!mood || !genre) {
        return res.status(400).json({ error: "Lütfen ruh hali ve tür seçin." });
    }

    try {
        let moodHistoryData = null;
        if (moodHistoryId) {
            moodHistoryData = await getMoodHistoryById(req.session.user.id, moodHistoryId);
        }

        const suggestion = await getMusicSuggestion(mood, genre, moodHistoryData, extraDetails);
        
        const lines = suggestion.split("\n");
        const songName = lines[0] || "";
        const reason = lines.slice(1).join(" ").trim() || "";
        
        const youtubeLink = await findYouTubeVideoSimple(songName);

        const userId = req.session.user.id;

        await db.execute(
            "INSERT INTO music_ai (user_id, mood, genre, song_name, reason, youtube_link) VALUES (?, ?, ?, ?, ?, ?)",
            [userId, mood, genre, songName, reason, youtubeLink]
        );

        res.json({ ok: true, suggestion, youtubeLink });
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

async function getMusicSuggestion(mood, genre, moodHistoryData, extraDetails) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return "API Key eksik.";

    let userMessage = `Ruh Hali: ${mood}\nTür: ${genre}\n`;
    
    if (extraDetails) {
        userMessage += `Ekstra Detaylar: ${extraDetails}\n`;
    }
    
    if (moodHistoryData) {
        userMessage += `\nKullanıcının geçmiş ruh hali analizi:\n`;
        userMessage += `- Ruh Hali: ${moodHistoryData.mood_label}\n`;
        userMessage += `- Tavsiye: ${moodHistoryData.advice}\n`;
        userMessage += `- Mini Görev: ${moodHistoryData.mini_task}\n`;
        userMessage += `Bu geçmiş analizi de dikkate alarak şarkı öner.\n`;
    }
    
    userMessage += `Bana ne önerirsin?`;

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
                    content: "Sen bir müzik gurmesisin. Kullanıcının ruh haline ve sevdiği türe göre nokta atışı BİR tane şarkı öner. Format: 'Sanatçı - Şarkı Adı'. Altına da tek cümlelik nedenini yaz. Türkçe cevap ver."
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

async function findYouTubeVideoSimple(searchQuery) {
    try {
        const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
        const resp = await fetch(searchUrl);
        const html = await resp.text();
        
        const videoIdMatch = html.match(/"videoId":"([^"]+)"/);
        if (videoIdMatch && videoIdMatch[1]) {
            return `https://www.youtube.com/watch?v=${videoIdMatch[1]}`;
        }
    } catch (err) {
        console.log("YouTube video bulma hatası:", err);
    }
    
    return null;
}

router.get("/music/history", requireLoginApi, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const [rows] = await db.execute(
            "SELECT id, mood, genre, song_name, reason, youtube_link, created_at FROM music_ai WHERE user_id=? ORDER BY id DESC",
            [userId]
        );
        res.json({ rows });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Sunucu hatası" });
    }
});

router.delete("/music/history/:id", requireLoginApi, async (req, res) => {
    try {
        const userId = req.session.user.id;
        const id = Number(req.params.id);
        await db.execute("DELETE FROM music_ai WHERE id=? AND user_id=?", [id, userId]);
        res.json({ ok: true });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Sunucu hatası" });
    }
});

module.exports = router;
