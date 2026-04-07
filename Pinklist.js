const gridEl = document.getElementById("PinklistGrid");

function formatMoney(amount) {
  return `₹${Number(amount).toFixed(2)}`;
}

function renderWishlist(list) {
  gridEl.innerHTML = "";

  if (!list || list.length === 0) {
    gridEl.innerHTML = `<p>Your Pinklist is empty 💖</p>`;
    return;
  }

  list.forEach((product, index) => {
    const card = document.createElement("div");
    card.className = "product-card";

    card.innerHTML = `
      <img class="product-image" src="${product.image}" />
      <div class="product-name">${product.name}</div>
      <div class="product-price">${formatMoney(product.price)}</div>
      <button class="btn danger" data-index="${index}">Remove</button>
    `;

    const btn = card.querySelector("button");

    btn.addEventListener("click", () => {
      let updatedList = JSON.parse(localStorage.getItem("pinkCart_Pinklist")) || [];
      updatedList.splice(index, 1);
      localStorage.setItem("pinkCart_Pinklist", JSON.stringify(updatedList));
      renderWishlist(updatedList);
    });

    gridEl.appendChild(card);
  });
}

// ✅ MAIN LOAD
(function init() {
  const list = JSON.parse(localStorage.getItem("pinkCart_Pinklist")) || [];
  renderWishlist(list);
})();