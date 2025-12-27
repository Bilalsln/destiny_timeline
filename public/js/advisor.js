const form = document.getElementById("advisorForm");
const qEl = document.getElementById("question");
const ansEl = document.getElementById("answerBox");
const historyEl = document.getElementById("recordsBox");
const refreshBtn = document.getElementById("refreshBtn");

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

let allAdvisorItems = [];
let showingAllAdvisor = false;

function renderAdvisorItems(items) {
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
            <button class="btn btn-sm btn-outline-danger" onclick="deleteAdvisor(${x.id})">Sil</button>
          </div>

          <div class="fw-semibold mt-2">Soru</div>
          <div class="text-muted2">${escapeHtml(x.question)}</div>

          <div class="fw-semibold mt-2">Yapay Zekanın Cevabı</div>
          <div>${escapeHtml(x.aiAnswer)}</div>
        </div>
      `;
    })
    .join("");
}

async function loadHistory() {
  historyEl.textContent = "Yükleniyor...";

  const res = await fetch("/api/advisor");
  if (!res.ok) {
    historyEl.textContent = "Kayıtlar alınamadı.";
    return;
  }

  const out = await res.json();
  if (!out.items || out.items.length === 0) {
    historyEl.textContent = "Henüz kayıt yok.";
    return;
  }

  allAdvisorItems = out.items;
  showingAllAdvisor = false;
  displayAdvisorHistory();
}

function displayAdvisorHistory() {
  const itemsToShow = showingAllAdvisor ? allAdvisorItems : allAdvisorItems.slice(0, 2);
  let html = renderAdvisorItems(itemsToShow);
  
  if (allAdvisorItems.length > 2) {
    if (showingAllAdvisor) {
      html += `<button class="btn btn-sm btn-outline-light mt-3 w-100" onclick="toggleAdvisorView()">Gizle</button>`;
    } else {
      html += `<button class="btn btn-sm btn-outline-light mt-3 w-100" onclick="toggleAdvisorView()">Tümünü Gör (${allAdvisorItems.length})</button>`;
    }
  }
  
  historyEl.innerHTML = html;
}

window.toggleAdvisorView = function() {
  showingAllAdvisor = !showingAllAdvisor;
  displayAdvisorHistory();
}

async function askAdvisor(e) {
  e?.preventDefault();
  const question = qEl.value.trim();
  if (question.length < 5) {
    ansEl.textContent = "Soru çok kısa.";
    return;
  }

  ansEl.textContent = "AI cevap üretiyor...";

  const res = await fetch("/api/advisor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });

  const out = await res.json();

  if (!res.ok) {
    ansEl.textContent = out.error || "İşlem başarısız";
    return;
  }

  ansEl.textContent = out.aiAnswer || "Cevap alınamadı.";
  qEl.value = "";
  await loadHistory();
}

window.deleteAdvisor = async function (id) {
  if (!confirm("Bu kaydı silmek istiyor musun?")) return;

  const res = await fetch(`/api/advisor/${id}`, { method: "DELETE" });
  if (!res.ok) {
    alert("Silme başarısız");
    return;
  }

  await loadHistory();
};

form.addEventListener("submit", askAdvisor);
refreshBtn.addEventListener("click", loadHistory);

loadHistory();
