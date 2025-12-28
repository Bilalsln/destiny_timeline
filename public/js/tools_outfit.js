document.addEventListener("DOMContentLoaded", async () => {
  const suggestBtn = document.getElementById("suggestBtn");
  const genderSelect = document.getElementById("genderSelect");
  const moodSelect = document.getElementById("moodSelect");
  const weatherSelect = document.getElementById("weatherSelect");
  const moodHistorySelect = document.getElementById("moodHistorySelect");
  const activityInput = document.getElementById("activityInput");
  const resultArea = document.getElementById("resultArea");

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
    const gender = genderSelect.value.trim();
    const mood = moodSelect.value.trim();
    const weather = weatherSelect.value.trim();
    const activity = activityInput.value.trim();
    const moodHistoryId = moodHistorySelect.value.trim();

    if (!gender || !mood || !weather) {
      alert("Lütfen cinsiyet, ruh hali ve hava durumu seçin.");
      return;
    }

    suggestBtn.disabled = true;
    suggestBtn.textContent = "Öneri hazırlanıyor...";

    try {
      const res = await fetch("/api/outfit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gender, mood, weather, activity, moodHistoryId })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Hata oluştu");
        return;
      }

      document.getElementById("outfitResult").textContent = data.outfit;
      document.getElementById("outfitReason").textContent = data.reason;
      
      const imageContainer = document.getElementById("outfitImageContainer");
      const imageElement = document.getElementById("outfitImage");
      
      if (data.imageUrl) {
        imageElement.src = data.imageUrl;
        imageContainer.classList.remove("d-none");
      } else {
        imageContainer.classList.add("d-none");
      }
      
      resultArea.classList.remove("d-none");
    } catch (err) {
      console.error(err);
      alert("Bir hata oluştu");
    } finally {
      suggestBtn.disabled = false;
      suggestBtn.textContent = "👔 Kıyafet Öner";
    }
  });
});

