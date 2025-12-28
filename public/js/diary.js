const form = document.getElementById("diaryForm");
const aiBox = document.getElementById("aiAnswer");
const historyEl = document.getElementById("diaryList");
const refreshBtn = document.getElementById("refreshBtn");

let allDiaryItems = [];
let showingAllDiary = false;

function renderDiaryItems(items) {
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

async function loadHistory() {
  historyEl.textContent = "Yükleniyor...";

  const res = await fetch("/api/diary");
  if (!res.ok) {
    historyEl.textContent = "Kayıtlar alınamadı.";
    return;
  }

  const out = await res.json();
  if (!out.items || out.items.length === 0) {
    historyEl.textContent = "Henüz kayıt yok.";
    return;
  }

  allDiaryItems = out.items;
  showingAllDiary = false;
  displayDiaryHistory();
}

function displayDiaryHistory() {
  const itemsToShow = showingAllDiary ? allDiaryItems : allDiaryItems.slice(0, 2);
  let html = renderDiaryItems(itemsToShow);
  
  if (allDiaryItems.length > 2) {
    if (showingAllDiary) {
      html += `<button class="btn btn-sm btn-outline-light mt-3 w-100" onclick="toggleDiaryView()">Gizle</button>`;
    } else {
      html += `<button class="btn btn-sm btn-outline-light mt-3 w-100" onclick="toggleDiaryView()">Tümünü Gör (${allDiaryItems.length})</button>`;
    }
  }
  
  historyEl.innerHTML = html;
}

window.toggleDiaryView = function() {
  showingAllDiary = !showingAllDiary;
  displayDiaryHistory();
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
    aiBox.textContent = "Günlük metni çok kısa.";
    return;
  }

  aiBox.textContent = "Yapay Zeka önerisi oluşturuluyor...";

  const res = await fetch("/api/diary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ diaryText })
  });

  const out = await res.json();

  if (!res.ok) {
    aiBox.textContent = out.error || "İşlem başarısız";
    return;
  }

  aiBox.textContent = out.aiAdvice || "Öneri alınamadı.";
  form.reset();
  await loadHistory();
});

async function deleteItem(id) {
  if (!confirm("Bu kaydı silmek istiyor musun?")) return;

  const res = await fetch(`/api/diary/${id}`, {
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
