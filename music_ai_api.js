const express = require("express");
const router = express.Router();


function requireLoginApi(req, res, next) {
    if (req.session && req.session.user) return next();
    return res.status(401).json({ error: "Giriş gerekli" });
}

router.post("/music-ai", requireLoginApi, async (req, res) => {
    const mood = (req.body.mood || "").trim();
    const genre = (req.body.genre || "").trim();

    if (!mood || !genre) {
        return res.status(400).json({ error: "Lütfen ruh hali ve tür seçin." });
    }

    try {
        const suggestion = await getMusicSuggestion(mood, genre);

        res.json({ ok: true, suggestion });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "AI/Sunucu hatası" });
    }
});

async function getMusicSuggestion(mood, genre) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return "API Key eksik.";

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
                    content: `Ruh Hali: ${mood}\nTür: ${genre}\nBana ne önerirsin?`
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
    return data?.choices?.[0]?.message?.content?.trim() || "Öneri bulunamadı.";
}

module.exports = router;
