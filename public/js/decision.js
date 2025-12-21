const aEl = document.getElementById("a");
const bEl = document.getElementById("b");
const decideBtn = document.getElementById("decideBtn");
const outEl = document.getElementById("out");
const historyEl = document.getElementById("history");
const refreshBtn = document.getElementById("refreshBtn");

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function loadHistory() {
  historyEl.textContent = "Yükleniyor...";

  const res = await fetch("/api/decision");
  if (!res.ok) {
    historyEl.textContent = "Kayıtlar alınamadı.";
    return;
  }

  const out = await res.json();
  if (!out.items || out.items.length === 0) {
    historyEl.textContent = "Henüz kayıt yok.";
    return;
  }

  historyEl.innerHTML = out.items
    .map((x) => {
      const dt = new Date(x.createdAt).toLocaleString("tr-TR");
      return `
        <div class="mb-3 p-3"
          style="border:1px solid rgba(255,255,255,0.10);
                 border-radius:14px;
                 background:rgba(0,0,0,0.18)">

          <div class="d-flex justify-content-between align-items-center">
            <div class="text-muted2 small">${dt}</div>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteDecision(${x.id})">Sil</button>
          </div>

          <div class="fw-semibold mt-2">1. Seçenek</div>
          <div class="text-muted2">${escapeHtml(x.optionA)}</div>

          <div class="fw-semibold mt-2">2. Seçenek</div>
          <div class="text-muted2">${escapeHtml(x.optionB)}</div>

          <div class="fw-semibold mt-2">Yapay Zekanın Tercihi</div>
          <div>${escapeHtml(x.aiResult)}</div>
        </div>
      `;
    })
    .join("");
}

async function decide() {
  const optionA = aEl.value.trim();
  const optionB = bEl.value.trim();

  if (optionA.length < 2 || optionB.length < 2) {
    outEl.textContent = "Lütfen iki seçeneği de yaz.";
    return;
  }

  outEl.textContent = "AI öneri üretiyor...";

  const res = await fetch("/api/decision", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ optionA, optionB }),
  });

  const out = await res.json();
  if (!res.ok) {
    outEl.textContent = out.error || "İşlem başarısız";
    return;
  }

  outEl.textContent = out.aiResult || "Öneri alınamadı.";
  aEl.value = "";
  bEl.value = "";
  await loadHistory();
}

window.deleteDecision = async function (id) {
  if (!confirm("Bu kaydı silmek istiyor musun?")) return;

  const res = await fetch(`/api/decision/${id}`, { method: "DELETE" });
  if (!res.ok) {
    alert("Silme başarısız");
    return;
  }

  await loadHistory();
};

decideBtn.addEventListener("click", decide);
refreshBtn.addEventListener("click", loadHistory);

loadHistory();
