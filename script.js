const API_BASE = "http://localhost:3008";

const CART_KEY = "pinkCart_items_v1";
const TOKEN_KEY = "pinkCart_token";

const productGrid = document.getElementById("productGrid");
const cartItemsEl = document.getElementById("cartItems");
const cartTotalEl = document.getElementById("cartTotal");
const checkoutBtn = document.getElementById("checkoutBtn");
const noticeEl = document.getElementById("notice");

const pinklistNav = document.getElementById("pinklistNav");
const loginNav = document.getElementById("loginNav");
const logoutBtn = document.getElementById("logoutBtn");

let cart = loadCart();
let products = [];
let PinklistIds = new Set();

function formatMoney(amount) {
  return `₹${Number(amount || 0).toFixed(2)}`;
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

function setAuthNav() {
  const isLoggedIn = Boolean(getToken());
  if (loginNav) loginNav.style.display = isLoggedIn ? "none" : "inline-block";
  if (logoutBtn) logoutBtn.style.display = isLoggedIn ? "inline-block" : "none";
}

function loadCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
}

function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function showNotice(text) {
  if (!noticeEl) return;
  noticeEl.textContent = text;
  noticeEl.classList.add("show");
  setTimeout(() => noticeEl.classList.remove("show"), 1400);
}

function calculateTotal() {
  return cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
}

// ---------------- PRODUCTS ----------------
function renderProducts(products) {
  productGrid.innerHTML = "";

  products.forEach(product => {
    const div = document.createElement("div");
    div.classList.add("product-card");

    div.innerHTML = `
      <h3>${product.name}</h3>
      <img src="${product.image}" width="150"/>
      <p>${product.description || ""}</p>
      <p><strong>₹${product.price}</strong></p>

      <button class="cart-btn">🛒Add to Cart</button>
      <button class="pinklist-btn">🩷 Pinklist</button>
    `;
      const cartBtn = div.querySelector(".cart-btn");
    const pinkBtn = div.querySelector(".pinklist-btn");

    cartBtn.onclick = () => addToCart(product);
    pinkBtn.onclick = () => togglePinklist(product);

    productGrid.appendChild(div);
  });
}

    
// ---------------- CART ----------------
function renderCart() {
  cartItemsEl.innerHTML = "";

  if (cart.length === 0) {
    cartItemsEl.innerHTML = "Cart empty";
    cartTotalEl.textContent = "₹0.00";
    return;
  }

  cart.forEach((item) => {
    const div = document.createElement("div");
    div.innerHTML = `
      ${item.name} - ${item.quantity}
      <button>Remove</button>
    `;
    div.querySelector("button").onclick = () => removeFromCart(item.id);
    cartItemsEl.appendChild(div);
  });

  cartTotalEl.textContent = formatMoney(calculateTotal());
}

function addToCart(product) {
  const existing = cart.find((i) => i.id === product.id);
  if (existing) existing.quantity++;
  else cart.push({ ...product, quantity: 1 });

  saveCart();
  renderCart();
  showNotice("Added to cart");
}

function removeFromCart(id) {
  cart = cart.filter((i) => i.id !== id);
  saveCart();
  renderCart();
}
const PINKLIST_KEY = "pinkCart_Pinklist";

let Pinklist = JSON.parse(localStorage.getItem(PINKLIST_KEY)) || [];

function savePinklist(){
  localStorage.setItem(PINKLIST_KEY, JSON.stringify(Pinklist));
} 
function updatePinklistUI() {
  const nav = document.getElementById("pinklistNav");
  if (!nav) return;

  nav.innerText = `Pinklist (${Pinklist.length})`;
}
function togglePinklist(product) {
  const index = Pinklist.findIndex(i => i.id === product.id);

  if (index !== -1) {
    Pinklist.splice(index, 1);
    showNotice("Removed from Pinklist");
  } else {
    Pinklist.push(product);
    showNotice("Added to Pinklist 💖");
  }

  savePinklist();
  updatePinklistUI();
}
// ---------------- CHECKOUT ----------------
async function checkout() {
  if (cart.length === 0) return alert("Cart empty!");

  try {
    const res = await fetch(`${API_BASE}/order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ items: cart, total: calculateTotal() }),
    });

    const data = await res.json();
    alert("Order placed!");
  } catch {
    alert("Backend error");
  }

  cart = [];
  saveCart();
  renderCart();
}

// ---------------- LOGIN ----------------
async function loginUser(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (data.token) {
    localStorage.setItem(TOKEN_KEY, data.token);
    alert("Login success");
    setAuthNav();
  } else {
    alert(data.message || "Login failed");
  }
}

// ---------------- REGISTER ----------------
async function registerUser(email, password) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  alert(data.message || "Account created");
}

// ---------------- BUTTON HANDLERS ----------------
function handleLogin() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  loginUser(email, password);
}

function handleRegister() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  registerUser(email, password);
}

// ---------------- LOAD PRODUCTS ----------------
async function loadProducts() {
  const res = await fetch(`${API_BASE}/products`);
  const data = await res.json();
  products = data;
  renderProducts(products);
}

// ---------------- INIT ----------------
document.addEventListener("DOMContentLoaded", function () {

  renderCart();
  setAuthNav();
  loadProducts();

  const checkoutBtn = document.getElementById("checkoutBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  checkoutBtn?.addEventListener("click", checkout);

  logoutBtn?.addEventListener("click", function () {
    localStorage.removeItem(TOKEN_KEY);
    setAuthNav();
  });

});