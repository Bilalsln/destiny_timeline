const form = document.getElementById("loginForm");
const msg = document.getElementById("msg");

function show(type, text) {
  msg.innerHTML = `<div class="alert alert-${type}">${text}</div>`;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    email: form.email.value.trim(),
    password: form.password.value
  };

  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const out = await res.json();

    if (!res.ok) {
      show("danger", out.error || "Giriş başarısız");
      return;
    }

    show("success", "Giriş başarılı! Ana sayfaya yönlendiriliyorsun...");
    setTimeout(() => (window.location.href = "/"), 600);
  } catch {
    show("danger", "Sunucuya bağlanılamadı.");
  }
});
