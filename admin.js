const supabaseClient = window.supabase.createClient(
  window.YA_SUPABASE_URL,
  window.YA_SUPABASE_PUBLISHABLE_KEY
);
const $ = (s) => document.querySelector(s);

function showStatus(message, isError = false) {
  const el = $("#loginStatus");
  el.textContent = message;
  el.classList.remove("hidden");
  el.style.borderColor = isError ? "#8b3030" : "#555";
}

async function signIn() {
  const email = $("#adminEmail").value.trim();
  const password = $("#adminPassword").value;
  if (!email || !password) return showStatus("Enter your admin email and password.", true);

  $("#loginBtn").disabled = true;
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  $("#loginBtn").disabled = false;
  if (error) return showStatus(error.message, true);
  await showAdmin();
}

async function showAdmin() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return;
  $("#loginBox").classList.add("hidden");
  $("#adminPanel").classList.remove("hidden");
  $("#signedInAs").textContent = `Signed in as ${user.email}`;
  await renderProducts();
}

async function renderProducts() {
  const box = $("#adminProducts");
  box.innerHTML = "<p class='muted'>Loading products...</p>";
  const { data, error } = await supabaseClient.from("products").select("*").order("created_at", { ascending: false });
  if (error) {
    box.innerHTML = `<p class='notice'>${escapeHtml(error.message)}</p>`;
    return;
  }
  if (!data.length) {
    box.innerHTML = "<p class='muted'>No products yet.</p>";
    return;
  }
  box.innerHTML = data.map((p) => `
    <div class="admin-card">
      ${p.image_url ? `<img src="${p.image_url}" alt="${escapeHtml(p.name)}">` : `<div class="card-img" style="height:220px">YA</div>`}
      <strong>${escapeHtml(p.name)}</strong>
      <span class="muted">${Number(p.price)} MAD · ${escapeHtml(p.category)}</span>
      <button onclick="removeProduct(${p.id})">DELETE</button>
    </div>`).join("");
}

async function removeProduct(id) {
  if (!confirm("Delete this product for everyone?")) return;
  const { error } = await supabaseClient.from("products").delete().eq("id", id);
  if (error) return alert(error.message);
  await renderProducts();
}

async function compressImage(file) {
  const img = new Image();
  const url = URL.createObjectURL(file);
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = url;
  });
  const max = 1200;
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(url);
  return canvas.toDataURL("image/jpeg", 0.78);
}

$("#productForm").onsubmit = async (e) => {
  e.preventDefault();
  const form = e.target;
  const file = form.image.files[0];
  if (!file) return alert("Choose a product photo.");

  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return alert("Please sign in again.");

  $("#addBtn").disabled = true;
  $("#addBtn").textContent = "UPLOADING...";

  try {
    const imageUrl = await compressImage(file);
    const fd = new FormData(form);
    const product = {
      name: fd.get("name"),
      price: Number(fd.get("price")),
      category: fd.get("category"),
      sizes: fd.get("sizes"),
      description: fd.get("description"),
      image_url: imageUrl
    };

    const { error } = await supabaseClient.from("products").insert(product);
    if (error) throw error;
    form.reset();
    alert("Product added! Everyone can now see it on the YA website.");
    await renderProducts();
  } catch (err) {
    alert(err.message || "Could not add product.");
  } finally {
    $("#addBtn").disabled = false;
    $("#addBtn").textContent = "ADD PRODUCT FOR EVERYONE";
  }
};

$("#loginBtn").onclick = signIn;
$("#adminPassword").addEventListener("keydown", (e) => { if (e.key === "Enter") signIn(); });
$("#logoutBtn").onclick = async () => {
  await supabaseClient.auth.signOut();
  $("#adminPanel").classList.add("hidden");
  $("#loginBox").classList.remove("hidden");
  $("#adminPassword").value = "";
};

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[c]));
}

supabaseClient.auth.getSession().then(({ data: { session } }) => {
  if (session) showAdmin();
});
