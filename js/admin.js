/* Silk & Soul — Admin Panel (MongoDB API) */

const charts = {};
let currentSession = null;
let cache = { products: [], users: [], payments: [], admins: [], activity: [] };

const VIEW_META = {
  dashboard: { title: "Dashboard", subtitle: "Overview of store performance" },
  inventory: { title: "Inventory", subtitle: "Manage saree stock & products" },
  payments: { title: "Payments", subtitle: "Track orders & transactions" },
  users: { title: "Users", subtitle: "Customer accounts & activity" },
  admins: { title: "Admins", subtitle: "Team access & roles" }
};

function requireAuth() {
  const session = getSession();
  const token = getToken();
  if (!session || !token) {
    location.href = "index.html";
    return null;
  }
  return session;
}

function formatINR(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN");
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) +
    " · " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function initials(name) {
  return (name || "?")
    .split(" ")
    .map(w => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function statusBadge(status) {
  const map = {
    in_stock: "badge-success",
    low_stock: "badge-warning",
    out_of_stock: "badge-danger",
    completed: "badge-success",
    pending: "badge-warning",
    processing: "badge-info",
    failed: "badge-danger",
    refunded: "badge-muted",
    active: "badge-success",
    inactive: "badge-muted",
    blocked: "badge-danger",
    super_admin: "badge-gold",
    manager: "badge-info",
    support: "badge-muted"
  };
  const label = String(status || "").replace(/_/g, " ");
  return `<span class="badge ${map[status] || "badge-muted"}">${label}</span>`;
}

function toast(msg) {
  const el = document.getElementById("adminToast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 2500);
}

function sessionName() {
  return currentSession?.name || "Admin";
}

function destroyChart(key) {
  if (charts[key]) {
    charts[key].destroy();
    delete charts[key];
  }
}

function makeChart(key, canvasId, config) {
  destroyChart(key);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  charts[key] = new Chart(ctx, config);
}

function switchView(view) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.getElementById(`view-${view}`)?.classList.add("active");
  document.querySelectorAll(".nav-item[data-view]").forEach(n => {
    n.classList.toggle("active", n.dataset.view === view);
  });
  const meta = VIEW_META[view];
  if (meta) {
    document.getElementById("pageTitle").textContent = meta.title;
    document.getElementById("pageSubtitle").textContent = meta.subtitle;
  }
  closeSidebar();
  if (view === "dashboard") renderDashboard();
  if (view === "inventory") renderInventory();
  if (view === "payments") renderPayments();
  if (view === "users") renderUsers();
  if (view === "admins") renderAdmins();
}

function openSidebar() {
  document.getElementById("adminSidebar").classList.add("open");
  document.getElementById("sidebarOverlay").classList.add("open");
}

function closeSidebar() {
  document.getElementById("adminSidebar").classList.remove("open");
  document.getElementById("sidebarOverlay").classList.remove("open");
}

function closeModal(id) {
  document.getElementById(id).classList.remove("open");
}

function openModal(id) {
  document.getElementById(id).classList.add("open");
}

function logoutAdmin() {
  clearSession();
  location.href = "index.html";
}

function resolveAdminImage(src) {
  if (!src) return "";
  if (src.startsWith("data:") || src.startsWith("blob:") || src.startsWith("http")) return src;
  return "../" + src.replace(/^\.\.\//, "");
}

async function refreshCache() {
  const [products, users, payments, admins, activity] = await Promise.all([
    ProductsAPI.list(),
    UsersAPI.list(),
    PaymentsAPI.list(),
    AdminsAPI.list(),
    DashboardAPI.activity()
  ]);
  cache = { products, users, payments, admins, activity };
  return cache;
}

/* ——— Dashboard ——— */
async function renderDashboard() {
  try {
    const stats = await DashboardAPI.stats();
    cache.products = stats.products || [];
    cache.users = stats.users || [];
    cache.payments = stats.payments || [];
    cache.activity = stats.activity || [];

    document.getElementById("dashStats").innerHTML = `
      <div class="stat-card">
        <div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
        <div class="stat-label">Total Revenue</div>
        <div class="stat-value">${formatINR(stats.revenue)}</div>
        <div class="stat-meta">From completed payments</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg></div>
        <div class="stat-label">Products</div>
        <div class="stat-value">${stats.productCount}</div>
        <div class="stat-meta ${stats.lowStock ? "down" : ""}">${stats.lowStock} need restock</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div>
        <div class="stat-label">Customers</div>
        <div class="stat-value">${stats.userCount}</div>
        <div class="stat-meta">${stats.activeUsers} active</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg></div>
        <div class="stat-label">Pending Payments</div>
        <div class="stat-value">${stats.pendingPayments}</div>
        <div class="stat-meta neutral">Awaiting action</div>
      </div>
    `;

    const payments = stats.payments || [];
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d);
    }
    const dayLabels = days.map(d => d.toLocaleDateString("en-IN", { weekday: "short" }));
    const dayRevenue = days.map(d => {
      const key = d.toISOString().slice(0, 10);
      return payments
        .filter(p => p.status === "completed" && String(p.date).slice(0, 10) === key)
        .reduce((s, p) => s + p.amount, 0);
    });

    makeChart("revenue", "chartRevenue", {
      type: "line",
      data: {
        labels: dayLabels,
        datasets: [{
          label: "Revenue",
          data: dayRevenue,
          borderColor: "#7B1E3A",
          backgroundColor: "rgba(123,30,58,0.12)",
          fill: true,
          tension: 0.4,
          pointBackgroundColor: "#C9A962",
          pointRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { ticks: { callback: v => "₹" + (v / 1000) + "k" }, grid: { color: "rgba(229,217,204,0.6)" } },
          x: { grid: { display: false } }
        }
      }
    });

    const catCounts = {};
    (stats.products || []).forEach(i => { catCounts[i.category] = (catCounts[i.category] || 0) + 1; });
    const catLabels = Object.keys(catCounts);
    makeChart("category", "chartCategory", {
      type: "doughnut",
      data: {
        labels: catLabels.length ? catLabels.map(c => c.charAt(0).toUpperCase() + c.slice(1)) : ["No data"],
        datasets: [{
          data: catLabels.length ? Object.values(catCounts) : [1],
          backgroundColor: ["#7B1E3A", "#C9A962", "#A02850", "#2D6A4F", "#9A7B3C"],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "bottom", labels: { boxWidth: 12, padding: 14 } } },
        cutout: "62%"
      }
    });

    const methods = {};
    payments.forEach(p => { methods[p.method] = (methods[p.method] || 0) + 1; });
    const methodLabels = Object.keys(methods);
    makeChart("methods", "chartMethods", {
      type: "bar",
      data: {
        labels: methodLabels.length ? methodLabels : ["No data"],
        datasets: [{
          data: methodLabels.length ? Object.values(methods) : [0],
          backgroundColor: ["#7B1E3A", "#C9A962", "#2D6A4F", "#A02850"],
          borderRadius: 8,
          barThickness: 36
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: "rgba(229,217,204,0.6)" } },
          x: { grid: { display: false } }
        }
      }
    });

    document.getElementById("dashActivity").innerHTML = (stats.activity || []).slice(0, 6).map(a => `
      <div class="activity-item">
        <div class="activity-dot ${a.type}"></div>
        <div>
          <strong>${a.action}</strong>
          <span>${a.admin} · ${formatDate(a.time)}</span>
        </div>
      </div>
    `).join("") || `<div class="empty-state"><strong>No activity yet</strong><p>Actions will appear here from MongoDB</p></div>`;
  } catch (err) {
    toast(err.message || "Failed to load dashboard");
  }
}

/* ——— Inventory ——— */
async function renderInventory() {
  try {
    const q = (document.getElementById("invSearch")?.value || "").trim();
    const status = document.getElementById("invFilter")?.value || "all";
    const cat = document.getElementById("invCategory")?.value || "all";
    const params = {};
    if (q) params.search = q;
    if (status !== "all") params.status = status;
    if (cat !== "all") params.category = cat;
    const items = await ProductsAPI.list(params);
    cache.products = await ProductsAPI.list();

    const all = cache.products;
    const totalStock = all.reduce((s, i) => s + (i.stock || 0), 0);
    const low = all.filter(i => i.status === "low_stock").length;
    const out = all.filter(i => i.status === "out_of_stock").length;
    const value = all.reduce((s, i) => s + (i.stock || 0) * (i.price || 0), 0);

    document.getElementById("invStats").innerHTML = `
      <div class="stat-card"><div class="stat-label">SKUs</div><div class="stat-value">${all.length}</div><div class="stat-meta neutral">In MongoDB</div></div>
      <div class="stat-card"><div class="stat-label">Units in Stock</div><div class="stat-value">${totalStock}</div><div class="stat-meta">Across warehouse</div></div>
      <div class="stat-card"><div class="stat-label">Inventory Value</div><div class="stat-value">${formatINR(value)}</div><div class="stat-meta">At sale price</div></div>
      <div class="stat-card"><div class="stat-label">Alerts</div><div class="stat-value">${low + out}</div><div class="stat-meta ${low + out ? "down" : ""}">${low} low · ${out} out</div></div>
    `;

    const maxStock = Math.max(...all.map(i => i.stock || 0), 1);
    document.getElementById("invTableBody").innerHTML = items.map(i => {
      const pct = Math.max(4, Math.round(((i.stock || 0) / maxStock) * 100));
      const barClass = i.status === "out_of_stock" ? "out" : i.status === "low_stock" ? "low" : "";
      return `
        <tr>
          <td>
            <div class="cell-product">
              <img src="${resolveAdminImage(i.image)}" alt="">
              <div>
                <strong>${i.name}</strong>
                <span>${i.category} · ${i.fabric}</span>
              </div>
            </div>
          </td>
          <td>${i.sku || "—"}</td>
          <td>${formatINR(i.price)}</td>
          <td>
            <div class="stock-bar ${barClass}"><span style="width:${pct}%"></span></div>
            ${i.stock || 0}
          </td>
          <td>${statusBadge(i.status)}</td>
          <td>
            <div class="row-actions">
              <button class="icon-btn" title="Edit" onclick="openInventoryModal('${i.id}')">${editIcon()}</button>
              <button class="icon-btn" title="+5 stock" onclick="adjustStock('${i.id}', 5)">+</button>
              <button class="icon-btn" title="-1 stock" onclick="adjustStock('${i.id}', -1)">−</button>
              <button class="icon-btn danger" title="Delete" onclick="deleteInventory('${i.id}')">${trashIcon()}</button>
            </div>
          </td>
        </tr>
      `;
    }).join("") || `<tr><td colspan="6"><div class="empty-state"><strong>No products in database</strong><p>Add your first saree with + Add Product</p></div></td></tr>`;
  } catch (err) {
    toast(err.message || "Failed to load inventory");
  }
}

function setInvImagePreview(src) {
  const preview = document.getElementById("invImagePreview");
  const placeholder = document.getElementById("invUploadPlaceholder");
  const clearBtn = document.getElementById("invClearImage");
  document.getElementById("invImage").value = src || "";
  if (src) {
    preview.src = resolveAdminImage(src);
    preview.hidden = false;
    placeholder.hidden = true;
    clearBtn.hidden = false;
  } else {
    preview.removeAttribute("src");
    preview.hidden = true;
    placeholder.hidden = false;
    clearBtn.hidden = true;
  }
}

function handleInvImageFile(input) {
  const file = input.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    toast("Please choose an image file");
    return;
  }
  compressImageFile(file, 900, 0.8).then(dataUrl => {
    setInvImagePreview(dataUrl);
    toast("Photo added from device");
  }).catch(() => toast("Could not read image"));
  input.value = "";
}

function clearInvImage() {
  setInvImagePreview("");
  document.getElementById("invFileInput").value = "";
  document.getElementById("invCameraInput").value = "";
}

async function openInventoryModal(id) {
  document.getElementById("invModalTitle").textContent = id ? "Edit Product" : "Add Product";
  document.getElementById("invId").value = id || "";
  if (id) {
    try {
      const item = await ProductsAPI.get(id);
      document.getElementById("invName").value = item.name;
      document.getElementById("invSku").value = item.sku || "";
      document.getElementById("invCat").value = item.category;
      document.getElementById("invFabric").value = item.fabric || "";
      document.getElementById("invPrice").value = item.price;
      document.getElementById("invOrigPrice").value = item.originalPrice || "";
      document.getElementById("invStock").value = item.stock || 0;
      document.getElementById("invReorder").value = item.reorderLevel || 8;
      setInvImagePreview(item.image || "");
    } catch (err) {
      toast(err.message);
      return;
    }
  } else {
    document.getElementById("invForm").reset();
    document.getElementById("invId").value = "";
    document.getElementById("invReorder").value = 8;
    document.getElementById("invSku").value = "";
    setInvImagePreview("");
  }
  openModal("invModal");
}

async function saveInventoryItem(e) {
  e.preventDefault();
  const id = document.getElementById("invId").value;
  const payload = {
    name: document.getElementById("invName").value.trim(),
    sku: document.getElementById("invSku").value.trim() || undefined,
    category: document.getElementById("invCat").value,
    fabric: document.getElementById("invFabric").value.trim(),
    price: Number(document.getElementById("invPrice").value),
    originalPrice: Number(document.getElementById("invOrigPrice").value) || null,
    stock: Number(document.getElementById("invStock").value),
    reorderLevel: Number(document.getElementById("invReorder").value),
    image: document.getElementById("invImage").value.trim() || "images/products/saree-01.svg",
    colors: ["Custom"],
    occasion: ["festive"],
    description: ""
  };
  try {
    if (id) await ProductsAPI.update(id, payload);
    else await ProductsAPI.create(payload);
    closeModal("invModal");
    toast("Saved to MongoDB");
    renderInventory();
  } catch (err) {
    toast(err.message || "Save failed");
  }
}

async function adjustStock(id, delta) {
  try {
    await ProductsAPI.adjustStock(id, delta);
    toast("Stock updated");
    renderInventory();
  } catch (err) {
    toast(err.message);
  }
}

async function deleteInventory(id) {
  if (!confirm("Delete this product from MongoDB?")) return;
  try {
    await ProductsAPI.remove(id);
    toast("Product deleted");
    renderInventory();
  } catch (err) {
    toast(err.message);
  }
}

/* ——— Payments ——— */
async function renderPayments() {
  try {
    const q = (document.getElementById("paySearch")?.value || "").trim();
    const status = document.getElementById("payFilter")?.value || "all";
    const method = document.getElementById("payMethod")?.value || "all";
    const params = {};
    if (q) params.search = q;
    if (status !== "all") params.status = status;
    if (method !== "all") params.method = method;
    const payments = await PaymentsAPI.list(params);
    cache.payments = await PaymentsAPI.list();

    const all = cache.payments;
    const completed = all.filter(p => p.status === "completed");
    const revenue = completed.reduce((s, p) => s + p.amount, 0);
    const pending = all.filter(p => p.status === "pending" || p.status === "processing");
    const refunded = all.filter(p => p.status === "refunded").reduce((s, p) => s + p.amount, 0);
    const failed = all.filter(p => p.status === "failed").length;

    document.getElementById("payStats").innerHTML = `
      <div class="stat-card"><div class="stat-label">Collected</div><div class="stat-value">${formatINR(revenue)}</div><div class="stat-meta">${completed.length} payments</div></div>
      <div class="stat-card"><div class="stat-label">Pending</div><div class="stat-value">${pending.length}</div><div class="stat-meta neutral">${formatINR(pending.reduce((s,p)=>s+p.amount,0))}</div></div>
      <div class="stat-card"><div class="stat-label">Refunded</div><div class="stat-value">${formatINR(refunded)}</div><div class="stat-meta down">Processed refunds</div></div>
      <div class="stat-card"><div class="stat-label">Failed</div><div class="stat-value">${failed}</div><div class="stat-meta ${failed ? "down" : ""}">Needs follow-up</div></div>
    `;

    const statusCounts = {};
    ["completed", "pending", "processing", "failed", "refunded"].forEach(s => {
      statusCounts[s] = all.filter(p => p.status === s).length;
    });
    makeChart("payStatus", "chartPaymentStatus", {
      type: "bar",
      data: {
        labels: Object.keys(statusCounts).map(s => s.charAt(0).toUpperCase() + s.slice(1)),
        datasets: [{
          data: Object.values(statusCounts),
          backgroundColor: ["#1F7A4D", "#B7791F", "#2B6CB0", "#B83227", "#7A6556"],
          borderRadius: 8,
          barThickness: 42
        }]
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: "rgba(229,217,204,0.6)" } },
          y: { grid: { display: false } }
        }
      }
    });

    document.getElementById("payTableBody").innerHTML = payments.map(p => `
      <tr>
        <td><strong>${p.id}</strong><br><span style="font-size:0.75rem;color:var(--admin-muted)">${p.orderId || ""}</span></td>
        <td>
          <div class="cell-user">
            <div class="avatar-sm">${initials(p.userName)}</div>
            <div>${p.userName}</div>
          </div>
        </td>
        <td>${p.product || "—"}</td>
        <td><strong>${formatINR(p.amount)}</strong></td>
        <td>${p.method}</td>
        <td>${statusBadge(p.status)}</td>
        <td style="white-space:nowrap;font-size:0.82rem">${formatDate(p.date)}</td>
        <td>
          <div class="row-actions">
            <button class="icon-btn" title="Edit" onclick="openPaymentModal('${p.id}')">${editIcon()}</button>
            ${p.status === "completed" ? `<button class="btn-admin btn-admin-sm btn-admin-outline" onclick="updatePaymentStatus('${p.id}','refunded')">Refund</button>` : ""}
            ${p.status === "pending" || p.status === "processing" ? `<button class="btn-admin btn-admin-sm btn-admin-primary" onclick="updatePaymentStatus('${p.id}','completed')">Confirm</button>` : ""}
            <button class="icon-btn danger" title="Delete" onclick="deletePayment('${p.id}')">${trashIcon()}</button>
          </div>
        </td>
      </tr>
    `).join("") || `<tr><td colspan="8"><div class="empty-state"><strong>No payments in database</strong></div></td></tr>`;
  } catch (err) {
    toast(err.message || "Failed to load payments");
  }
}

async function populatePayUsers() {
  const users = await UsersAPI.list();
  cache.users = users;
  const sel = document.getElementById("payUser");
  sel.innerHTML = users.length
    ? users.map(u => `<option value="${u.id}">${u.name}</option>`).join("")
    : `<option value="">No users — add a user first</option>`;
}

async function openPaymentModal(id) {
  await populatePayUsers();
  document.getElementById("payModalTitle").textContent = id ? "Edit Payment" : "Record Payment";
  document.getElementById("payEditId").value = id || "";
  if (id) {
    const p = (await PaymentsAPI.list()).find(x => x.id === id);
    if (!p) return toast("Payment not found");
    if (p.userId) document.getElementById("payUser").value = p.userId;
    document.getElementById("payProduct").value = p.product || "";
    document.getElementById("payAmount").value = p.amount;
    document.getElementById("payMethodSelect").value = p.method;
    document.getElementById("payStatus").value = p.status;
  } else {
    document.getElementById("payForm").reset();
    document.getElementById("payEditId").value = "";
    document.getElementById("payStatus").value = "completed";
  }
  openModal("payModal");
}

async function savePayment(e) {
  e.preventDefault();
  const editId = document.getElementById("payEditId").value;
  const userId = document.getElementById("payUser").value;
  if (!userId) return toast("Add a customer first");
  const payload = {
    userId,
    product: document.getElementById("payProduct").value.trim(),
    amount: Number(document.getElementById("payAmount").value),
    method: document.getElementById("payMethodSelect").value,
    status: document.getElementById("payStatus").value
  };
  try {
    if (editId) await PaymentsAPI.update(editId, payload);
    else await PaymentsAPI.create(payload);
    closeModal("payModal");
    toast("Payment saved");
    renderPayments();
  } catch (err) {
    toast(err.message);
  }
}

async function updatePaymentStatus(id, status) {
  try {
    await PaymentsAPI.setStatus(id, status);
    toast(`Payment ${status}`);
    renderPayments();
  } catch (err) {
    toast(err.message);
  }
}

async function deletePayment(id) {
  if (!confirm("Delete this payment from MongoDB?")) return;
  try {
    await PaymentsAPI.remove(id);
    toast("Payment deleted");
    renderPayments();
  } catch (err) {
    toast(err.message);
  }
}

/* ——— Users ——— */
async function renderUsers() {
  try {
    const q = (document.getElementById("userSearch")?.value || "").trim();
    const status = document.getElementById("userFilter")?.value || "all";
    const params = {};
    if (q) params.search = q;
    if (status !== "all") params.status = status;
    const users = await UsersAPI.list(params);
    cache.users = await UsersAPI.list();
    const all = cache.users;

    const active = all.filter(u => u.status === "active").length;
    const spent = all.reduce((s, u) => s + (u.spent || 0), 0);
    const orders = all.reduce((s, u) => s + (u.orders || 0), 0);

    document.getElementById("userStats").innerHTML = `
      <div class="stat-card"><div class="stat-label">Total Users</div><div class="stat-value">${all.length}</div><div class="stat-meta">${active} active</div></div>
      <div class="stat-card"><div class="stat-label">Total Orders</div><div class="stat-value">${orders}</div><div class="stat-meta">Lifetime</div></div>
      <div class="stat-card"><div class="stat-label">Lifetime Value</div><div class="stat-value">${formatINR(spent)}</div><div class="stat-meta">All customers</div></div>
      <div class="stat-card"><div class="stat-label">Avg Order Value</div><div class="stat-value">${formatINR(orders ? Math.round(spent / orders) : 0)}</div><div class="stat-meta neutral">Per order</div></div>
    `;

    const top = [...all].sort((a, b) => (b.spent || 0) - (a.spent || 0)).slice(0, 5);
    makeChart("topUsers", "chartTopUsers", {
      type: "bar",
      data: {
        labels: top.length ? top.map(u => u.name.split(" ")[0]) : ["No data"],
        datasets: [{
          data: top.length ? top.map(u => u.spent || 0) : [0],
          backgroundColor: "#7B1E3A",
          borderRadius: 8,
          barThickness: 28
        }]
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { callback: v => "₹" + (v / 1000) + "k" }, grid: { color: "rgba(229,217,204,0.6)" } },
          y: { grid: { display: false } }
        }
      }
    });

    const st = { active: 0, inactive: 0, blocked: 0 };
    all.forEach(u => { st[u.status] = (st[u.status] || 0) + 1; });
    makeChart("userStatus", "chartUserStatus", {
      type: "doughnut",
      data: {
        labels: ["Active", "Inactive", "Blocked"],
        datasets: [{
          data: [st.active, st.inactive, st.blocked],
          backgroundColor: ["#1F7A4D", "#7A6556", "#B83227"],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "bottom", labels: { boxWidth: 12 } } },
        cutout: "60%"
      }
    });

    document.getElementById("userTableBody").innerHTML = users.map(u => `
      <tr>
        <td>
          <div class="cell-user">
            <div class="avatar-sm">${u.avatar || initials(u.name)}</div>
            <div>
              <strong>${u.name}</strong>
              <div style="font-size:0.75rem;color:var(--admin-muted)">Joined ${u.joined || "—"}</div>
            </div>
          </div>
        </td>
        <td>
          <div>${u.email}</div>
          <div style="font-size:0.78rem;color:var(--admin-muted)">${u.phone || ""}</div>
        </td>
        <td>${u.city || "—"}</td>
        <td>${u.orders || 0}</td>
        <td><strong>${formatINR(u.spent || 0)}</strong></td>
        <td>${statusBadge(u.status)}</td>
        <td>
          <div class="row-actions">
            <button class="icon-btn" title="Edit" onclick="openUserModal('${u.id}')">${editIcon()}</button>
            ${u.status !== "blocked"
              ? `<button class="btn-admin btn-admin-sm btn-admin-danger" onclick="setUserStatus('${u.id}','blocked')">Block</button>`
              : `<button class="btn-admin btn-admin-sm btn-admin-outline" onclick="setUserStatus('${u.id}','active')">Unblock</button>`}
            <button class="icon-btn danger" title="Delete" onclick="deleteUser('${u.id}')">${trashIcon()}</button>
          </div>
        </td>
      </tr>
    `).join("") || `<tr><td colspan="7"><div class="empty-state"><strong>No users in database</strong></div></td></tr>`;
  } catch (err) {
    toast(err.message || "Failed to load users");
  }
}

async function openUserModal(id) {
  document.getElementById("userModalTitle").textContent = id ? "Edit User" : "Add User";
  document.getElementById("userId").value = id || "";
  if (id) {
    const users = await UsersAPI.list();
    const u = users.find(x => x.id === id);
    if (!u) return toast("User not found");
    document.getElementById("userName").value = u.name;
    document.getElementById("userEmail").value = u.email;
    document.getElementById("userPhone").value = u.phone || "";
    document.getElementById("userCity").value = u.city || "";
    document.getElementById("userStatus").value = u.status;
  } else {
    document.getElementById("userForm").reset();
    document.getElementById("userId").value = "";
  }
  openModal("userModal");
}

async function saveUser(e) {
  e.preventDefault();
  const id = document.getElementById("userId").value;
  const payload = {
    name: document.getElementById("userName").value.trim(),
    email: document.getElementById("userEmail").value.trim(),
    phone: document.getElementById("userPhone").value.trim(),
    city: document.getElementById("userCity").value.trim(),
    status: document.getElementById("userStatus").value
  };
  try {
    if (id) await UsersAPI.update(id, payload);
    else await UsersAPI.create(payload);
    closeModal("userModal");
    toast("User saved");
    renderUsers();
  } catch (err) {
    toast(err.message);
  }
}

async function setUserStatus(id, status) {
  try {
    await UsersAPI.setStatus(id, status);
    toast("User status updated");
    renderUsers();
  } catch (err) {
    toast(err.message);
  }
}

async function deleteUser(id) {
  if (!confirm("Delete this user from MongoDB?")) return;
  try {
    await UsersAPI.remove(id);
    toast("User deleted");
    renderUsers();
  } catch (err) {
    toast(err.message);
  }
}

/* ——— Admins ——— */
async function renderAdmins() {
  try {
    const q = (document.getElementById("adminSearch")?.value || "").trim();
    const params = q ? { search: q } : {};
    const admins = await AdminsAPI.list(params);
    cache.admins = admins;
    const activity = await DashboardAPI.activity();

    const roles = { super_admin: 0, manager: 0, support: 0 };
    admins.forEach(a => { if (roles[a.role] !== undefined) roles[a.role]++; });

    document.getElementById("adminRoleCards").innerHTML = `
      <div class="role-card"><span>Super Admins</span><strong>${roles.super_admin}</strong><span>Full access</span></div>
      <div class="role-card"><span>Managers</span><strong>${roles.manager}</strong><span>Ops & inventory</span></div>
      <div class="role-card"><span>Support</span><strong>${roles.support}</strong><span>Payments & users</span></div>
    `;

    document.getElementById("adminTableBody").innerHTML = admins.map(a => `
      <tr>
        <td>
          <div class="cell-user">
            <div class="avatar-sm gold">${a.avatar || initials(a.name)}</div>
            <strong>${a.name}</strong>
          </div>
        </td>
        <td>${a.email}</td>
        <td>${statusBadge(a.role)}</td>
        <td>${statusBadge(a.status)}</td>
        <td style="font-size:0.82rem">${formatDate(a.lastLogin)}</td>
        <td>
          <div class="row-actions">
            <button class="icon-btn" title="Edit" onclick="openAdminModal('${a.id}')">${editIcon()}</button>
            ${a.id !== currentSession?.id ? `<button class="icon-btn danger" title="Delete" onclick="deleteAdmin('${a.id}')">${trashIcon()}</button>` : ""}
          </div>
        </td>
      </tr>
    `).join("") || `<tr><td colspan="6"><div class="empty-state"><strong>No admins</strong></div></td></tr>`;

    document.getElementById("adminActivity").innerHTML = activity.map(a => `
      <div class="activity-item">
        <div class="activity-dot ${a.type}"></div>
        <div>
          <strong>${a.action}</strong>
          <span>${a.admin} · ${formatDate(a.time)}</span>
        </div>
      </div>
    `).join("") || `<div class="empty-state"><strong>No activity yet</strong></div>`;
  } catch (err) {
    toast(err.message || "Failed to load admins");
  }
}

async function openAdminModal(id) {
  document.getElementById("adminModalTitle").textContent = id ? "Edit Admin" : "Add Admin";
  document.getElementById("adminId").value = id || "";
  if (id) {
    const admins = await AdminsAPI.list();
    const a = admins.find(x => x.id === id);
    if (!a) return toast("Admin not found");
    document.getElementById("adminName").value = a.name;
    document.getElementById("adminEmail").value = a.email;
    document.getElementById("adminPassword").value = "";
    document.getElementById("adminPassword").required = false;
    document.getElementById("adminPassword").placeholder = "Leave blank to keep current";
    document.getElementById("adminRole").value = a.role;
    document.getElementById("adminStatus").value = a.status;
  } else {
    document.getElementById("adminForm").reset();
    document.getElementById("adminId").value = "";
    document.getElementById("adminPassword").required = true;
    document.getElementById("adminPassword").placeholder = "";
    document.getElementById("adminRole").value = "manager";
  }
  openModal("adminModal");
}

async function saveAdmin(e) {
  e.preventDefault();
  const id = document.getElementById("adminId").value;
  const payload = {
    name: document.getElementById("adminName").value.trim(),
    email: document.getElementById("adminEmail").value.trim(),
    role: document.getElementById("adminRole").value,
    status: document.getElementById("adminStatus").value
  };
  const password = document.getElementById("adminPassword").value;
  if (password) payload.password = password;
  if (!id && !password) return toast("Password required");

  try {
    let saved;
    if (id) saved = await AdminsAPI.update(id, payload);
    else saved = await AdminsAPI.create(payload);
    if (id && id === currentSession?.id) {
      setSession(getToken(), saved);
      currentSession = saved;
      paintSidebarUser();
    }
    closeModal("adminModal");
    toast("Admin saved");
    renderAdmins();
  } catch (err) {
    toast(err.message);
  }
}

async function deleteAdmin(id) {
  if (!confirm("Remove this admin from MongoDB?")) return;
  try {
    await AdminsAPI.remove(id);
    toast("Admin removed");
    renderAdmins();
  } catch (err) {
    toast(err.message);
  }
}

function editIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
}

function trashIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;
}

function paintSidebarUser() {
  const el = document.getElementById("sidebarUser");
  if (!el || !currentSession) return;
  el.innerHTML = `
    <div class="avatar">${currentSession.avatar || initials(currentSession.name)}</div>
    <div>
      <strong>${currentSession.name}</strong>
      <small>${(currentSession.role || "").replace(/_/g, " ")}</small>
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", async () => {
  currentSession = requireAuth();
  if (!currentSession) return;
  paintSidebarUser();

  const resetBtn = document.querySelector(".topbar-actions .btn-admin");
  if (resetBtn) resetBtn.style.display = "none";

  try {
    currentSession = await AuthAPI.me();
    setSession(getToken(), currentSession);
    paintSidebarUser();
  } catch {
    clearSession();
    location.href = "index.html";
    return;
  }

  renderDashboard();

  document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", e => {
      if (e.target === overlay) overlay.classList.remove("open");
    });
  });
});
