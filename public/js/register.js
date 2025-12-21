const form = document.getElementById("registerForm");
const msg = document.getElementById("msg");

function show(type, text) {
  msg.innerHTML = `<div class="alert alert-${type}">${text}</div>`;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    fullName: form.fullName.value.trim(),
    email: form.email.value.trim(),
    password: form.password.value
  };

  try {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const out = await res.json();

    if (!res.ok) {
      show("danger", out.error || "Kayıt başarısız");
      return;
    }

    show("success", "Kayıt başarılı! Giriş sayfasına yönlendiriliyorsun...");
    setTimeout(() => (window.location.href = "/login"), 900);
  } catch {
    show("danger", "Sunucuya bağlanılamadı.");
  }
});
