const supabaseClient = window.supabase.createClient(
  window.YA_SUPABASE_URL,
  window.YA_SUPABASE_PUBLISHABLE_KEY
);

let products = [];
let cart = JSON.parse(localStorage.getItem("yaCart") || "[]");
const $ = (s) => document.querySelector(s);

async function loadProducts() {
  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    $("#products").innerHTML = `<p class="muted">Could not load the collection right now.</p>`;
    return;
  }
  products = data || [];
  renderProducts("all");
}

function renderProducts(filter = "all") {
  const list = filter === "all" ? products : products.filter((p) => p.category === filter);
  if (!list.length) {
    $("#products").innerHTML = `<div class="panel"><p class="muted">No pieces in this collection yet.</p></div>`;
    return;
  }

  $("#products").innerHTML = list.map((p) => `
    <article class="card">
      <div class="card-img">${p.image_url ? `<img src="${p.image_url}" alt="${escapeHtml(p.name)}" style="width:100%;height:100%;object-fit:cover">` : "YA"}</div>
      <div class="card-info">
        <h3>${escapeHtml(p.name)}</h3>
        <div class="muted">${escapeHtml(p.sizes || "Sizes available")}</div>
        <div class="price">${Number(p.price)} MAD</div>
        <button class="add" data-id="${p.id}">ADD TO BAG</button>
      </div>
    </article>`).join("");

  document.querySelectorAll(".add").forEach((btn) => {
    btn.addEventListener("click", () => addToCart(btn.dataset.id));
  });
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[c]));
}

function addToCart(id) {
  const product = products.find((p) => String(p.id) === String(id));
  if (!product) return;
  cart.push(product);
  localStorage.setItem("yaCart", JSON.stringify(cart));
  renderCart();
  $("#drawer").classList.add("open");
}

function renderCart() {
  $("#cartCount").textContent = cart.length;
  $("#cartItems").innerHTML = cart.length
    ? cart.map((p) => `<div class="cart-row"><span>${escapeHtml(p.name)}</span><strong>${Number(p.price)} MAD</strong></div>`).join("")
    : "<p class='muted'>Your bag is empty.</p>";
  $("#cartTotal").textContent = cart.reduce((a, p) => a + Number(p.price), 0) + " MAD";
}

document.querySelectorAll(".filter").forEach((b) => b.addEventListener("click", () => {
  document.querySelectorAll(".filter").forEach((x) => x.classList.remove("active"));
  b.classList.add("active");
  renderProducts(b.dataset.filter);
}));

$("#cartBtn").onclick = () => $("#drawer").classList.add("open");
$("#closeCart").onclick = () => $("#drawer").classList.remove("open");
$("#drawer").onclick = (e) => { if (e.target.id === "drawer") $("#drawer").classList.remove("open"); };
$("#checkout").onclick = () => alert("Add your WhatsApp number in app.js to enable ordering.");

loadProducts();
renderCart();
