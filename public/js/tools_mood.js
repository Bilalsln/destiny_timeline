async function loadQuestions() {
  const res = await fetch("/api/mood/questions");
  const data = await res.json();

  const area = document.getElementById("questionsArea");
  area.innerHTML = data.questions.map((q, i) => `
    <div class="mb-3">
      <label class="form-label">${i + 1}) ${q}</label>
      <input class="form-control" id="q${i}" placeholder="Cevabın..." />
    </div>
  `).join("");
}

function getAnswers(count) {
  const answers = [];
  for (let i = 0; i < count; i++) {
    answers.push(document.getElementById(`q${i}`).value.trim());
  }
  return answers;
}

async function analyzeAndSave() {
  const resQ = await fetch("/api/mood/questions");
  const qData = await resQ.json();

  const answers = getAnswers(qData.questions.length);
  if (answers.some(a => a.length === 0)) {
    alert("Lütfen tüm soruları cevapla.");
    return;
  }

  const btn = document.getElementById("analyzeBtn");
  btn.disabled = true;
  btn.textContent = "Analiz ediliyor...";

  const res = await fetch("/api/mood/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers })
  });

  const data = await res.json();

  btn.disabled = false;
  btn.textContent = "Analiz Et ve Kaydet";

  if (!res.ok) {
    alert(data.error || "Hata oluştu");
    return;
  }

  const r = data.result;
  document.getElementById("resultBox").innerHTML = `
    <div class="mt-2"><b>Ruh Hali:</b> ${r.mood_label}</div>
    <div class="mt-2"><b>Tavsiye:</b> ${r.message}</div>
    <div class="mt-2"><b>Mini Görev:</b> ${r.mini_task}</div>
  `;

  await loadHistory();
}

let allMoodItems = [];
let showingAllMood = false;

function renderMoodItems(items) {
  return items.map(row => `
    <div class="stat mb-3">
      <div class="stat-txt">${new Date(row.created_at).toLocaleString("tr-TR")}</div>
      <div class="mt-2"><b>${row.mood_label}</b></div>
      <div class="mt-2">${row.advice}</div>
      <div class="mt-2"><b>Mini görev:</b> ${row.mini_task}</div>

      <button class="btn btn-sm btn-outline-light mt-3" onclick="deleteHistory(${row.id})">Sil</button>
    </div>
  `).join("");
}

async function loadHistory() {
  const res = await fetch("/api/mood/history");
  const data = await res.json();

  const area = document.getElementById("historyArea");
  if (!data.rows || data.rows.length === 0) {
    area.innerHTML = `<div class="text-muted2">Henüz kayıt yok.</div>`;
    return;
  }

  allMoodItems = data.rows;
  showingAllMood = false;
  displayMoodHistory();
}

function displayMoodHistory() {
  const area = document.getElementById("historyArea");
  const itemsToShow = showingAllMood ? allMoodItems : allMoodItems.slice(0, 2);
  let html = renderMoodItems(itemsToShow);
  
  if (allMoodItems.length > 2) {
    if (showingAllMood) {
      html += `<button class="btn btn-sm btn-outline-light mt-3 w-100" onclick="toggleMoodView()">Gizle</button>`;
    } else {
      html += `<button class="btn btn-sm btn-outline-light mt-3 w-100" onclick="toggleMoodView()">Tümünü Gör (${allMoodItems.length})</button>`;
    }
  }
  
  area.innerHTML = html;
}

window.toggleMoodView = function() {
  showingAllMood = !showingAllMood;
  displayMoodHistory();
}

async function deleteHistory(id) {
  if (!confirm("Bu kaydı silmek istiyor musun?")) return;

  const res = await fetch(`/api/mood/history/${id}`, { method: "DELETE" });
  const data = await res.json();

  if (!res.ok) {
    alert(data.error || "Silme hatası");
    return;
  }

  await loadHistory();
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadQuestions();
  await loadHistory();

  document.getElementById("analyzeBtn").addEventListener("click", analyzeAndSave);
});
