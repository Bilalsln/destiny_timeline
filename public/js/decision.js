const form = document.getElementById("decisionForm");
const decisionTextEl = document.getElementById("decisionText");
const outEl = document.getElementById("decisionAnswer");
const historyEl = document.getElementById("decisionList");
const refreshBtn = document.getElementById("refreshBtn");

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

let allDecisionItems = [];
let showingAllDecision = false;

function renderDecisionItems(items) {
  return items
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

  allDecisionItems = out.items;
  showingAllDecision = false;
  displayDecisionHistory();
}

function displayDecisionHistory() {
  const itemsToShow = showingAllDecision ? allDecisionItems : allDecisionItems.slice(0, 2);
  let html = renderDecisionItems(itemsToShow);
  
  if (allDecisionItems.length > 2) {
    if (showingAllDecision) {
      html += `<button class="btn btn-sm btn-outline-light mt-3 w-100" onclick="toggleDecisionView()">Gizle</button>`;
    } else {
      html += `<button class="btn btn-sm btn-outline-light mt-3 w-100" onclick="toggleDecisionView()">Tümünü Gör (${allDecisionItems.length})</button>`;
    }
  }
  
  historyEl.innerHTML = html;
}

window.toggleDecisionView = function() {
  showingAllDecision = !showingAllDecision;
  displayDecisionHistory();
}

async function decide(e) {
  e?.preventDefault();
  const optionA = decisionTextEl.value.trim();
  const optionB = "Diğer seçenek veya durum yok"; // Tek alanlı form için placeholder

  if (optionA.length < 2) {
    outEl.textContent = "Lütfen kararını yaz.";
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
  decisionTextEl.value = "";
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

form.addEventListener("submit", decide);
refreshBtn.addEventListener("click", loadHistory);

loadHistory();
