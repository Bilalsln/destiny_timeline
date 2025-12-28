document.addEventListener("DOMContentLoaded", async () => {
  const suggestBtn = document.getElementById("suggestBtn");
  const travelTypeSelect = document.getElementById("travelTypeSelect");
  const withWhoSelect = document.getElementById("withWhoSelect");
  const durationSelect = document.getElementById("durationSelect");
  const moodHistorySelect = document.getElementById("moodHistorySelect");
  const minBudget = document.getElementById("minBudget");
  const maxBudget = document.getElementById("maxBudget");
  const extraDetails = document.getElementById("extraDetails");
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
    const travelType = travelTypeSelect.value.trim();
    const withWho = withWhoSelect.value.trim();
    const duration = durationSelect.value.trim();
    const minBudgetValue = minBudget.value.trim();
    const maxBudgetValue = maxBudget.value.trim();
    const extraDetailsValue = extraDetails.value.trim();
    const moodHistoryId = moodHistorySelect.value.trim();

    if (!travelType || !withWho || !duration || !minBudgetValue || !maxBudgetValue) {
      alert("Lütfen tüm zorunlu alanları doldurun.");
      return;
    }

    if (Number(minBudgetValue) > Number(maxBudgetValue)) {
      alert("Minimum bütçe maksimum bütçeden büyük olamaz.");
      return;
    }

    suggestBtn.disabled = true;
    suggestBtn.textContent = "Öneri hazırlanıyor...";

    try {
      const res = await fetch("/api/travel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          travelType,
          withWho,
          duration,
          minBudget: minBudgetValue,
          maxBudget: maxBudgetValue,
          extraDetails: extraDetailsValue,
          moodHistoryId
        })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Hata oluştu");
        return;
      }

      document.getElementById("travelResult").innerHTML = data.suggestion.replace(/\n/g, "<br>");
      resultArea.classList.remove("d-none");
    } catch (err) {
      console.error(err);
      alert("Bir hata oluştu");
    } finally {
      suggestBtn.disabled = false;
      suggestBtn.textContent = "✈️ Tatil Öner";
    }
  });
});

