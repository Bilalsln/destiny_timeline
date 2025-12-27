document.addEventListener("DOMContentLoaded", async () => {
  const suggestBtn = document.getElementById("suggestBtn");
  const moodSelect = document.getElementById("moodSelect");
  const genreSelect = document.getElementById("genreSelect");
  const moodHistorySelect = document.getElementById("moodHistorySelect");
  const resultArea = document.getElementById("resultArea");
  const suggestionTitle = document.getElementById("suggestionTitle");
  const suggestionReason = document.getElementById("suggestionReason");

  async function loadMoodHistory() {
    try {
      const res = await fetch("/api/mood/history");
      const data = await res.json();
      
      if (data.rows && data.rows.length > 0) {
        moodHistorySelect.innerHTML = '<option value="">Seçiniz...</option>';
        data.rows.forEach(row => {
          const date = new Date(row.created_at).toLocaleDateString("tr-TR");
          const option = document.createElement("option");
          option.value = row.id;
          option.textContent = `${date} - ${row.mood_label}`;
          moodHistorySelect.appendChild(option);
        });
      }
    } catch (err) {
      console.log("Ruh hali geçmişi yüklenemedi:", err);
    }
  }

  await loadMoodHistory();

  suggestBtn.addEventListener("click", async () => {
    const mood = moodSelect.value.trim();
    const genre = genreSelect.value.trim();
    const moodHistoryId = moodHistorySelect.value.trim();

    if (!mood || !genre) {
      alert("Lütfen ruh hali ve müzik türü seçin.");
      return;
    }

    suggestBtn.disabled = true;
    suggestBtn.textContent = "Öneri hazırlanıyor...";

    try {
      const res = await fetch("/api/music-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood, genre, moodHistoryId })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Hata oluştu");
        return;
      }

      const suggestion = data.suggestion || "";
      const youtubeLink = data.youtubeLink || "";
      const lines = suggestion.split("\n").filter(l => l.trim());
      
      if (lines.length > 0) {
        suggestionTitle.textContent = lines[0];
        suggestionReason.textContent = lines.slice(1).join(" ") || "";
      } else {
        suggestionTitle.textContent = suggestion;
        suggestionReason.textContent = "";
      }

      const youtubeBtn = document.getElementById("youtubeLink");
      if (youtubeLink) {
        youtubeBtn.href = youtubeLink;
      } else {
        const songName = lines.length > 0 ? lines[0] : suggestion;
        const searchQuery = encodeURIComponent(songName);
        youtubeBtn.href = `https://www.youtube.com/results?search_query=${searchQuery}`;
      }

      resultArea.classList.remove("d-none");
      await loadMusicHistory();
    } catch (err) {
      console.error(err);
      alert("Bir hata oluştu");
    } finally {
      suggestBtn.disabled = false;
      suggestBtn.textContent = "🎵 Bana Şarkı Öner";
    }
  });

  let allMusicItems = [];
  let showingAllMusic = false;

  function renderMusicItems(items) {
    return items.map(row => `
      <div class="stat mb-3">
        <div class="stat-txt">${new Date(row.created_at).toLocaleString("tr-TR")}</div>
        <div class="mt-2"><b>${row.song_name}</b></div>
        <div class="mt-2">${row.reason}</div>
        <div class="mt-2"><b>Ruh Hali:</b> ${row.mood}</div>
        <div class="mt-2"><b>Tür:</b> ${row.genre}</div>
        ${row.youtube_link ? `<a href="${row.youtube_link}" target="_blank" class="btn btn-sm btn-outline-light mt-2">▶ YouTube'da Dinle</a>` : ''}
        <button class="btn btn-sm btn-outline-light mt-2" onclick="deleteMusicHistory(${row.id})">Sil</button>
      </div>
    `).join("");
  }

  async function loadMusicHistory() {
    try {
      const res = await fetch("/api/music/history");
      const data = await res.json();
      
      const area = document.getElementById("historyArea");
      if (!data.rows || data.rows.length === 0) {
        area.innerHTML = `<div class="text-muted2">Henüz kayıt yok.</div>`;
        return;
      }

      allMusicItems = data.rows;
      showingAllMusic = false;
      displayMusicHistory();
    } catch (err) {
      console.log("Müzik geçmişi yüklenemedi:", err);
    }
  }

  function displayMusicHistory() {
    const area = document.getElementById("historyArea");
    const itemsToShow = showingAllMusic ? allMusicItems : allMusicItems.slice(0, 2);
    let html = renderMusicItems(itemsToShow);
    
    if (allMusicItems.length > 2) {
      if (showingAllMusic) {
        html += `<button class="btn btn-sm btn-outline-light mt-3 w-100" onclick="toggleMusicView()">Gizle</button>`;
      } else {
        html += `<button class="btn btn-sm btn-outline-light mt-3 w-100" onclick="toggleMusicView()">Tümünü Gör (${allMusicItems.length})</button>`;
      }
    }
    
    area.innerHTML = html;
  }

  window.toggleMusicView = function() {
    showingAllMusic = !showingAllMusic;
    displayMusicHistory();
  }

  window.deleteMusicHistory = async function(id) {
    if (!confirm("Bu kaydı silmek istiyor musun?")) return;

    const res = await fetch(`/api/music/history/${id}`, { method: "DELETE" });
    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Silme hatası");
      return;
    }

    await loadMusicHistory();
  }

  await loadMusicHistory();
});

