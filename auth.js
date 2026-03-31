/**
 * auth.js
 * Handles:
 * - POST /auth/register
 * - POST /auth/login
 * Stores JWT token in localStorage
 */

// Backend base URL (must match server port)
const API_BASE = "http://localhost:3008";

// localStorage key for JWT token
const TOKEN_KEY = "pinkCart_token";

function setNotice(el, message, isError) {
  if (!el) return;
  el.textContent = message || "";
  el.style.color = isError ? "#ff2e52" : "#3a2a33";
  el.style.opacity = message ? "1" : "0";
}

function getFormData(formEl) {
  const form = new FormData(formEl);
  return {
    email: String(form.get("email") || ""),
    password: String(form.get("password") || ""),
  };
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let data = null;
  try {
    data = await res.json();
  } catch (err) {
    data = null;
  }
  return { ok: res.ok, status: res.status, data };
}

async function handleLogin() {
  const form = document.getElementById("loginForm");
  const noticeEl = document.getElementById("authNotice");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setNotice(noticeEl, "Logging in...", false);

    const { email, password } = getFormData(form);

    const result = await postJson(`${API_BASE}/auth/login`, { email, password });
    if (!result.ok) {
      setNotice(noticeEl, result.data?.message || "Login failed", true);
      return;
    }

    // Save token
    localStorage.setItem(TOKEN_KEY, result.data.token);

    // Go back to home page
   window.location.href = "/index.html";
  });
}

async function handleRegister() {
  const form = document.getElementById("registerForm");
  const noticeEl = document.getElementById("authNotice");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setNotice(noticeEl, "Creating account...", false);

    const { email, password } = getFormData(form);

    const result = await postJson(`${API_BASE}/auth/register`, { email, password });
    if (!result.ok) {
      setNotice(noticeEl, result.data?.message || "Registration failed", true);
      return;
    }

    setNotice(noticeEl, "Account created! Redirecting to login...", false);

    // After a short delay, go to login
    setTimeout(() => {
      window.location.href = "login.html";
    }, 900);
  });
}

handleLogin();
handleRegister();