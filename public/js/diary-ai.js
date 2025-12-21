const form = document.getElementById("diaryForm");
const msg = document.getElementById("msg");
const aiBox = document.getElementById("aiBox");
const history = document.getElementById("history");
const refreshBtn = document.getElementById("refreshBtn");

function show(type, text) {
  msg.innerHTML = `<div class="alert alert-${type}">${text}</div>`;
}

async function loadHistory() {
  history.textContent = "Yükleniyor...";

  const res = await fetch("/api/diary-ai");
  if (!res.ok) {
    history.textContent = "Kayıtlar alınamadı.";
    return;
  }

  const out = await res.json();
  if (!out.items || out.items.length === 0) {
    history.textContent = "Henüz kayıt yok.";
    return;
  }

  history.innerHTML = out.items
  .map((x) => {
    const dt = new Date(x.createdAt).toLocaleString("tr-TR");

    return `
      <div class="mb-3 p-3"
        style="border:1px solid rgba(255,255,255,0.10);
               border-radius:14px;
               background:rgba(0,0,0,0.18)">

        <div class="d-flex justify-content-between align-items-center">
          <div class="text-muted2 small">${dt}</div>
          <button class="btn btn-sm btn-outline-danger"
            onclick="deleteItem(${x.id})">
            Sil
          </button>
        </div>

        <div class="fw-semibold mt-2">Günlük</div>
        <div class="text-muted2">${escapeHtml(x.diaryText)}</div>

        <div class="fw-semibold mt-2">Yapay Zeka Önerisi</div>
        <div>${escapeHtml(x.aiAdvice)}</div>
      </div>
    `;
  })
  .join("");

}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const diaryText = form.diaryText.value.trim();
  if (diaryText.length < 10) {
    show("warning", "Günlük metni çok kısa.");
    return;
  }

  show("info", "Yapay Zeka önerisi oluşturuluyor...");

  const res = await fetch("/api/diary-ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ diaryText })
  });

  const out = await res.json();

  if (!res.ok) {
    show("danger", out.error || "İşlem başarısız");
    return;
  }

  show("success", "Kaydedildi ✅");
  aiBox.textContent = out.aiAdvice || "Öneri alınamadı.";
  form.reset();
  await loadHistory();
});

async function deleteItem(id) {
  if (!confirm("Bu kaydı silmek istiyor musun?")) return;

  const res = await fetch(`/api/diary-ai/${id}`, {
    method: "DELETE"
  });

  if (!res.ok) {
    alert("Silme başarısız");
    return;
  }

  await loadHistory();
}


refreshBtn.addEventListener("click", loadHistory);

loadHistory();
