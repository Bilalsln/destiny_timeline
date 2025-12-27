const express = require("express");
const router = express.Router();
const db = require("../data/db");

const QUESTIONS = [
  "Bugün genel olarak nasıl hissediyorsun? (0-10)",
  "Son 24 saatte stres seviyen kaç? (0-10)",
  "Enerjin nasıl? (0-10)",
  "Uyku kaliten nasıldı? (0-10)",
  "Son günlerde motivasyonun nasıl? (0-10)",
  "Kendini yalnız hissediyor musun? (0-10)",
  "Gün içinde keyif aldığın bir şey oldu mu? Kısaca yaz.",
  "Kafanı en çok meşgul eden konu ne? Kısaca yaz.",
  "Şu an en çok neye ihtiyacın var? (dinlenme/konuşma/düzen/başarı vb.)",
  "Bugün kendin için yapabileceğin küçük bir iyilik ne olabilir?"
];

function requireLoginApi(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.status(401).json({ error: "Giriş gerekli" });
}

router.get("/mood/questions", requireLoginApi, (req, res) => {
  res.json({ questions: QUESTIONS });
});

router.post("/mood/analyze", requireLoginApi, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const answers = req.body.answers;

    if (!Array.isArray(answers) || answers.length !== QUESTIONS.length) {
      return res.status(400).json({ error: "Cevaplar eksik veya hatalı." });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "OPENAI_API_KEY bulunamadı." });

    const inputText = `
Sen samimi bir arkadaş gibi konuşan bir "Ruh Hali Danışmanı"sın.
Kullanıcıyla konuşuyormuş gibi yaz: sıcak, yargılamayan, kısa paragraf/paragraf.
Kesinlikle madde madde (1.,2.,3.) yazma.
"Ruh halin kötü" gibi sert etiketleme yapma; daha yumuşak söyle.

Çıktıyı SADECE JSON olarak ver.

Kurallar:
- mood_score: 0-100 arası sayı (0 çok kötü, 100 çok iyi)
- mood_label: 1-3 kelimelik kısa etiket (örn: "yorgun ve gergin")
- message: 6-10 cümlelik arkadaşça sohbet metni (kullanıcıya "sen" diye hitap et)
- mini_task: tek cümle, yapılabilir mini görev

Sorular ve cevaplar:
${QUESTIONS.map((q, i) => `S${i + 1}: ${q}\nC${i + 1}: ${answers[i]}`).join("\n\n")}
`.trim();

    const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Sadece geçerli JSON döndür. Kod bloğu kullanma. Ek açıklama yazma."
          },
          { role: "user", content: inputText }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "mood_result",
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                mood_score: { type: "number" },
                mood_label: { type: "string" },
                message: { type: "string" },
                mini_task: { type: "string" }
              },
              required: ["mood_score", "mood_label", "message", "mini_task"]
            }
          }
        }
      })
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      return res.status(500).json({ error: "AI isteği başarısız", detail: txt });
    }

    const data = await aiResp.json();
    const content =
      data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content
        : "";

    let result;
    try {
      result = JSON.parse(content);
    } catch {
      return res.status(500).json({ error: "AI JSON dönmedi", raw: content });
    }

    const moodScore = Number(result.mood_score) || 0;
    const moodLabel = result.mood_label || "Bilinmiyor";
    const message = result.message || "";
    const miniTask = result.mini_task || "";

    await db.execute(
      `INSERT INTO mood_history (user_id, answers_json, mood_label, advice, mini_task, music_suggestion)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        JSON.stringify(answers),
        `${moodScore}/100 - ${moodLabel}`,
        message,
        miniTask,
        ""
      ]
    );

    res.json({ ok: true, result });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

router.get("/mood/history", requireLoginApi, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const [rows] = await db.execute(
      "SELECT id, mood_label, advice, mini_task, created_at FROM mood_history WHERE user_id=? ORDER BY id DESC",
      [userId]
    );
    res.json({ rows });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

router.delete("/mood/history/:id", requireLoginApi, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const id = Number(req.params.id);

    await db.execute("DELETE FROM mood_history WHERE id=? AND user_id=?", [id, userId]);
    res.json({ ok: true });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

module.exports = router;
