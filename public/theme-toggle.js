(function() {
  const STORAGE_KEY = "theme-preference";
  const body = document.body;

  function applyTheme(theme) {
    if (theme === "light") {
      body.classList.add("theme-light");
    } else {
      body.classList.remove("theme-light");
    }
    updateButton(theme);
  }

  function updateButton(theme) {
    const btn = document.getElementById("theme-toggle");
    if (!btn) return;
    const isLight = theme === "light";
    btn.textContent = isLight ? "🌙" : "☀️";
    btn.setAttribute("aria-label", isLight ? "Switch to dark mode" : "Switch to light mode");
  }

  function getInitial() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
    return "light";
  }

  function ensureButton() {
    let btn = document.getElementById("theme-toggle");
    if (btn) return btn;
    const nav = document.querySelector("header nav");
    if (!nav) return null;
    btn = document.createElement("button");
    btn.id = "theme-toggle";
    btn.type = "button";
    btn.className = "theme-toggle";
    nav.appendChild(btn);
    return btn;
  }

  const btn = ensureButton();
  const initial = getInitial();
  applyTheme(initial);

  if (btn) {
    btn.addEventListener("click", () => {
      const next = body.classList.contains("theme-light") ? "dark" : "light";
      localStorage.setItem(STORAGE_KEY, next);
      applyTheme(next);
    });
  }
})();
