/**
 * wishlist.js
 * - Loads wishlist for logged-in user (JWT token in localStorage)
 * - Allows removing items (toggle endpoint)
 */

const API_BASE = "http://localhost:3008";
const TOKEN_KEY = "pinkCart_token";

const noticeEl = document.getElementById("PinklistNotice");
const gridEl = document.getElementById("PinklistGrid");
const logoutBtn = document.getElementById("logoutBtn");

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

function setNotice(message, isError) {
  if (!noticeEl) return;
  noticeEl.textContent = message || "";
  noticeEl.style.color = isError ? "#ff2e52" : "#3a2a33";
  noticeEl.style.opacity = message ? "1" : "0";
}

function requireLogin() {
  const token = getToken();
  if (!token) {
    alert("Please login to view your wishlist.");
    window.location.href = "login.html";
    return null;
  }
  return token;
}

async function loadWishlist(token) {
  const res = await fetch(`${API_BASE}/wishlist`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  let data = null;
  try {
    data = await res.json();
  } catch (err) {
    data = null;
  }

  if (!res.ok) {
    const msg = data?.message || "Failed to load wishlist.";
    throw new Error(msg);
  }

  return data; // array of products
}

async function toggleWishlist(token, productId) {
  const res = await fetch(`${API_BASE}/wishlist/toggle`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ productId }),
  });

  let data = null;
  try {
    data = await res.json();
  } catch (err) {
    data = null;
  }

  if (!res.ok) {
    const msg = data?.message || "Failed to update wishlist.";
    throw new Error(msg);
  }

  return data;
}

function formatMoney(amount) {
  const num = Number(amount) || 0;
  return `₹${num.toFixed(2)}`;
}

function renderWishlist(list) {
  gridEl.innerHTML = "";

  if (!list || list.length === 0) {
    gridEl.innerHTML = `<p style="margin:0;color:#7b5f6a">Your wishlist is empty.</p>`;
    return;
  }

  list.forEach((product) => {
    const card = document.createElement("div");
    card.className = "product-card";

    card.innerHTML = `
      <img class="product-image" src="${product.image}" alt="${product.name}" />
      <div class="product-name">${product.name}</div>
      <div class="product-price">${formatMoney(product.price)}</div>
      <div class="product-desc">${product.description || ""}</div>
      <div class="product-actions">
  <button class="btn primary">Add to Cart</button>

  <button class="btn secondary">Pinklist 💖</button>

  <button class="btn danger" type="button" data-remove="${product.id}">
    Remove
  </button>
</div>
    `;

    const btn = card.querySelector("button[data-remove]");
    btn.addEventListener("click", async () => {
      const token = requireLogin();
      if (!token) return;

      try {
        setNotice("Updating...", false);
        await toggleWishlist(token, product.id);
        setNotice("Removed from wishlist.", false);
        const updated = await loadWishlist(token);
        renderWishlist(updated);
      } catch (err) {
        setNotice(err.message, true);
      }
    });

    gridEl.appendChild(card);
  });
}

logoutBtn?.addEventListener("click", () => {
  localStorage.removeItem(TOKEN_KEY);
  window.location.href = "login.html";
});

(async function init() {
  const token = requireLogin();
  if (!token) return;

  try {
    setNotice("Loading wishlist...", false);
    const list = await loadWishlist(token);
    renderWishlist(list);
    setNotice("", false);
  } catch (err) {
    setNotice(err.message, true);
  }
})();