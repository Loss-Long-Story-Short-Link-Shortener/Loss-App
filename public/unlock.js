// Password interstitial behaviour for protected short links (served from the
// same origin so the site-wide CSP can stay free of 'unsafe-inline' scripts).
(function () {
  var form = document.getElementById("f");
  if (!form) return;
  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    var err = document.getElementById("err");
    var button = form.querySelector("button");
    err.style.display = "none";
    button.disabled = true;
    try {
      var res = await fetch("/api/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: form.dataset.slug, password: document.getElementById("pw").value }),
      });
      var data = await res.json();
      if (res.ok && data.destination) {
        window.location.replace(data.destination);
        return;
      }
      err.textContent = data.error || "Parola hatalı.";
    } catch (x) {
      err.textContent = "Bağlantı hatası. Lütfen tekrar deneyin.";
    }
    err.style.display = "block";
    button.disabled = false;
  });
})();
