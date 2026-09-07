function initShopPage() {
  loadStoreData().then(() => {
    const params = new URLSearchParams(window.location.search);
    const category = params.get("category") || "all";
    const search = params.get("search") || "";
    const occasion = params.get("occasion") || "";
    const sort = params.get("sort") || "featured";
    const minPrice = parseInt(params.get("minPrice")) || 0;
    const maxPrice = parseInt(params.get("maxPrice")) || 50000;

    document.getElementById("searchInput").value = search;
    document.getElementById("sortSelect").value = sort;
    document.getElementById("minPrice").value = minPrice || "";
    document.getElementById("maxPrice").value = maxPrice < 50000 ? maxPrice : "";

    renderCategoryFilters(category);
    renderOccasionFilters(occasion);
    renderProducts(filterProducts(category, search, occasion, sort, minPrice, maxPrice));
    updateResultCount(category, search, occasion, minPrice, maxPrice);
  });
}

function filterProducts(category, search, occasion, sort, minPrice, maxPrice) {
  let filtered = [...PRODUCTS];

  if (category && category !== "all") {
    filtered = filtered.filter(p => p.category === category);
  }
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(p =>
      (p.name || "").toLowerCase().includes(q) ||
      (p.category || "").toLowerCase().includes(q) ||
      (p.fabric || "").toLowerCase().includes(q) ||
      (p.description || "").toLowerCase().includes(q)
    );
  }
  if (occasion) {
    filtered = filtered.filter(p => (p.occasion || []).includes(occasion));
  }
  filtered = filtered.filter(p => p.price >= minPrice && p.price <= maxPrice);

  switch (sort) {
    case "price-low": filtered.sort((a, b) => a.price - b.price); break;
    case "price-high": filtered.sort((a, b) => b.price - a.price); break;
    case "rating": filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0)); break;
    case "newest": filtered.sort((a, b) => (b.new ? 1 : 0) - (a.new ? 1 : 0)); break;
    default: filtered.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
  }
  return filtered;
}

function renderCategoryFilters(active) {
  const el = document.getElementById("categoryFilters");
  if (!el) return;
  el.innerHTML = CATEGORIES.map(c => `
    <button class="filter-chip ${active === c.id ? "active" : ""}" onclick="applyFilter('category','${c.id}')">
      ${c.name}
    </button>
  `).join("");
}

function renderOccasionFilters(active) {
  const el = document.getElementById("occasionFilters");
  if (!el) return;
  el.innerHTML = `<button class="filter-chip ${!active ? "active" : ""}" onclick="applyFilter('occasion','')">All</button>` +
    OCCASIONS.map(o => `
      <button class="filter-chip ${active === o.id ? "active" : ""}" onclick="applyFilter('occasion','${o.id}')">
        ${o.name}
      </button>
    `).join("");
}

function renderProducts(products) {
  const grid = document.getElementById("productGrid");
  const empty = document.getElementById("emptyState");
  if (!grid) return;

  if (products.length === 0) {
    grid.innerHTML = "";
    if (empty) empty.style.display = "block";
    return;
  }
  if (empty) empty.style.display = "none";
  grid.innerHTML = products.map(renderProductCard).join("");
}

function updateResultCount(category, search, occasion, minPrice, maxPrice) {
  const el = document.getElementById("resultCount");
  if (!el) return;
  const count = filterProducts(category, search, occasion,
    document.getElementById("sortSelect")?.value || "featured", minPrice, maxPrice).length;
  el.textContent = `${count} saree${count !== 1 ? "s" : ""} found`;
}

function applyFilter(key, value) {
  const params = new URLSearchParams(window.location.search);
  if (value) params.set(key, value);
  else params.delete(key);
  window.location.search = params.toString();
}

function applyFilters() {
  const params = new URLSearchParams(window.location.search);
  const search = document.getElementById("searchInput").value;
  const sort = document.getElementById("sortSelect").value;
  const min = document.getElementById("minPrice").value;
  const max = document.getElementById("maxPrice").value;

  if (search) params.set("search", search);
  else params.delete("search");
  params.set("sort", sort);
  if (min) params.set("minPrice", min);
  else params.delete("minPrice");
  if (max) params.set("maxPrice", max);
  else params.delete("maxPrice");

  window.location.search = params.toString();
}

function toggleFilters() {
  document.querySelector(".shop-sidebar")?.classList.toggle("open");
}

function initProductPage() {
  loadStoreData().then(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    const product = getEffectiveProduct(id) || getProductById(id);
    const pid = JSON.stringify(String(id || ""));

    if (!product) {
      document.getElementById("productContent").innerHTML = `
        <div class="empty-state">
          <h2>Product not found</h2>
          <a href="shop.html" class="btn btn-primary">Back to Shop</a>
        </div>`;
      return;
    }

    document.title = `${product.name} | ${STORE_NAME}`;
    const discount = product.originalPrice
      ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;
    const mainImg = resolveImageSrc(product.images?.[0] || product.image);
    const thumbs = (product.images && product.images.length ? product.images : [product.image]);
    const colors = product.colors?.length ? product.colors : ["Default"];
    const occasions = product.occasion || [];

    document.getElementById("productContent").innerHTML = `
    <div class="product-detail">
      <div class="product-gallery">
        <div class="main-image tryon-main">
          <img id="mainImage" src="${mainImg}" alt="${product.name}" onclick="openTryOn(${pid}, event)" title="Click for AI Try-On">
          <button type="button" class="btn btn-gold tryon-main-btn" onclick="openTryOn(${pid}, event)">✦ AI Try-On — See It Worn</button>
        </div>
        <div class="thumb-list">
          ${thumbs.map((img, i) => `
            <button type="button" class="thumb ${i === 0 ? "active" : ""}" data-src="${encodeURIComponent(resolveImageSrc(img))}" onclick="setMainProductImage(this)">
              <img src="${resolveImageSrc(img)}" alt="View ${i + 1}">
            </button>
          `).join("")}
        </div>
      </div>
      <div class="product-details">
        <nav class="breadcrumb">
          <a href="index.html">Home</a> / <a href="shop.html">Shop</a> / <span>${product.name}</span>
        </nav>
        <span class="product-category">${product.category} · ${product.fabric || ""}</span>
        <h1>${product.name}</h1>
        <div class="product-rating large">${renderStars(product.rating || 0)} <span>${product.rating || 0} (${product.reviews || 0} reviews)</span></div>
        <div class="product-price large">
          <span class="price-current">${formatPrice(product.price)}</span>
          ${product.originalPrice ? `<span class="price-original">${formatPrice(product.originalPrice)}</span>` : ""}
          ${discount > 0 ? `<span class="discount-tag">Save ${discount}%</span>` : ""}
        </div>
        <p class="product-desc">${product.description || ""}</p>
        <div class="option-group">
          <label>Color</label>
          <div class="color-options" id="colorOptions">
            ${colors.map((c, i) => `
              <button class="color-btn ${i === 0 ? "active" : ""}" data-color="${c}" onclick="selectColor(this)">${c}</button>
            `).join("")}
          </div>
        </div>
        <div class="option-group">
          <label>Quantity</label>
          <div class="qty-control">
            <button onclick="changeQty(-1)">−</button>
            <input type="number" id="qtyInput" value="1" min="1" max="10">
            <button onclick="changeQty(1)">+</button>
          </div>
        </div>
        <div class="product-actions">
          <button class="btn btn-primary btn-lg" onclick="addToCartFromDetail(${pid})">Add to Cart</button>
          <button class="btn btn-outline btn-lg" onclick="toggleWishlist(${pid}); this.textContent = isInWishlist(${pid}) ? '♥ Wishlisted' : '♡ Add to Wishlist'">
            ${isInWishlist(product.id) ? "♥ Wishlisted" : "♡ Add to Wishlist"}
          </button>
        </div>
        <a href="https://wa.me/919876543210?text=Hi, I'm interested in ${encodeURIComponent(product.name)}" class="btn btn-whatsapp btn-lg" target="_blank">
          💬 Order on WhatsApp
        </a>
        <div class="product-meta">
          <div class="meta-item"><strong>✓</strong> Free shipping above ₹5,000</div>
          <div class="meta-item"><strong>✓</strong> 7-day easy returns</div>
          <div class="meta-item"><strong>✓</strong> 100% authentic handloom</div>
          <div class="meta-item"><strong>✓</strong> COD available</div>
        </div>
        <div class="occasion-tags">
          ${occasions.map(o => `<span class="tag">${OCCASIONS.find(x => x.id === o)?.name || o}</span>`).join("")}
        </div>
      </div>
    </div>
    <section class="related-section">
      <h2>You May Also Like</h2>
      <div class="product-grid">
        ${PRODUCTS.filter(p => String(p.id) !== String(product.id) && p.category === product.category).slice(0, 4).map(renderProductCard).join("")}
      </div>
    </section>
  `;
  });
}

function selectColor(btn) {
  document.querySelectorAll(".color-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
}

function setMainProductImage(btn) {
  const src = decodeURIComponent(btn.dataset.src || "");
  const main = document.getElementById("mainImage");
  if (main && src) main.src = src;
  document.querySelectorAll(".thumb").forEach(t => t.classList.remove("active"));
  btn.classList.add("active");
}

function changeQty(delta) {
  const input = document.getElementById("qtyInput");
  input.value = Math.max(1, Math.min(10, parseInt(input.value) + delta));
}

function addToCartFromDetail(productId) {
  const color = document.querySelector(".color-btn.active")?.dataset.color;
  const qty = parseInt(document.getElementById("qtyInput").value) || 1;
  addToCart(productId, color, qty);
}

function initCartPage() {
  renderCart();
}

function renderCart() {
  const cart = getCart();
  const container = document.getElementById("cartContent");
  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🛒</div>
        <h2>Your cart is empty</h2>
        <p>Discover our beautiful saree collection</p>
        <a href="shop.html" class="btn btn-primary">Continue Shopping</a>
      </div>`;
    return;
  }

  const subtotal = getCartTotal();
  const shipping = subtotal >= 5000 ? 0 : 199;
  const total = subtotal + shipping;

  container.innerHTML = `
    <div class="cart-layout">
      <div class="cart-items">
        <h2>Shopping Cart (${getCartCount()} items)</h2>
        ${cart.map(item => `
          <div class="cart-item">
            <img src="${resolveImageSrc(item.image)}" alt="${item.name}">
            <div class="cart-item-info">
              <h3>${item.name}</h3>
              <p>Color: ${item.color}</p>
              <p class="price-current">${formatPrice(item.price)}</p>
            </div>
            <div class="qty-control">
              <button onclick="updateItemQty('${item.key}', ${item.quantity - 1})">−</button>
              <span>${item.quantity}</span>
              <button onclick="updateItemQty('${item.key}', ${item.quantity + 1})">+</button>
            </div>
            <p class="cart-item-total">${formatPrice(item.price * item.quantity)}</p>
            <button class="remove-btn" onclick="removeFromCart('${item.key}'); renderCart()" aria-label="Remove">✕</button>
          </div>
        `).join("")}
      </div>
      <div class="cart-summary">
        <h3>Order Summary</h3>
        <div class="summary-row"><span>Subtotal</span><span>${formatPrice(subtotal)}</span></div>
        <div class="summary-row"><span>Shipping</span><span>${shipping === 0 ? "FREE" : formatPrice(shipping)}</span></div>
        ${subtotal < 5000 ? `<p class="shipping-note">Add ${formatPrice(5000 - subtotal)} more for free shipping!</p>` : ""}
        <div class="summary-row total"><span>Total</span><span>${formatPrice(total)}</span></div>
        <button class="btn btn-primary btn-lg btn-block" onclick="showCheckout()">Proceed to Checkout</button>
        <a href="shop.html" class="btn btn-outline btn-block">Continue Shopping</a>
        <div class="coupon-form">
          <input type="text" id="couponCode" placeholder="Coupon code">
          <button class="btn btn-sm" onclick="applyCoupon()">Apply</button>
        </div>
      </div>
    </div>
    <div id="checkoutModal" class="modal">
      <div class="modal-content">
        <button class="modal-close" onclick="closeCheckout()">✕</button>
        <h2>Checkout</h2>
        <form id="checkoutForm" onsubmit="submitOrder(event)">
          <div class="form-row">
            <div class="form-group"><label>Full Name</label><input required name="name"></div>
            <div class="form-group"><label>Phone</label><input required name="phone" type="tel"></div>
          </div>
          <div class="form-group"><label>Email</label><input required name="email" type="email"></div>
          <div class="form-group"><label>Address</label><textarea required name="address" rows="3"></textarea></div>
          <div class="form-row">
            <div class="form-group"><label>City</label><input required name="city"></div>
            <div class="form-group"><label>Pincode</label><input required name="pincode"></div>
          </div>
          <div class="form-group">
            <label>Payment Method</label>
            <select name="payment">
              <option value="cod">Cash on Delivery</option>
              <option value="upi">UPI</option>
              <option value="card">Credit/Debit Card</option>
            </select>
          </div>
          <button type="submit" class="btn btn-primary btn-lg btn-block">Place Order — ${formatPrice(total)}</button>
        </form>
      </div>
    </div>
  `;
}

function updateItemQty(key, qty) {
  if (qty < 1) { removeFromCart(key); renderCart(); return; }
  updateCartQuantity(key, qty);
  renderCart();
}

function showCheckout() {
  document.getElementById("checkoutModal")?.classList.add("open");
}

function closeCheckout() {
  document.getElementById("checkoutModal")?.classList.remove("open");
}

function applyCoupon() {
  const code = document.getElementById("couponCode")?.value?.toUpperCase();
  if (code === "SILK10") showToast("10% discount applied! (Demo)");
  else showToast("Invalid coupon code");
}

function submitOrder(e) {
  e.preventDefault();
  saveCart([]);
  closeCheckout();
  document.getElementById("cartContent").innerHTML = `
    <div class="empty-state success-state">
      <div class="empty-icon">✓</div>
      <h2>Order Placed Successfully!</h2>
      <p>Thank you for shopping with ${STORE_NAME}. We'll send you a confirmation shortly.</p>
      <a href="shop.html" class="btn btn-primary">Continue Shopping</a>
    </div>`;
  updateCartBadge();
}

function initWishlistPage() {
  loadStoreData().then(() => {
    const list = getWishlist();
    const container = document.getElementById("wishlistContent");
    if (!container) return;

    if (list.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">♥</div>
          <h2>Your wishlist is empty</h2>
          <p>Save your favorite sarees here</p>
          <a href="shop.html" class="btn btn-primary">Browse Collection</a>
        </div>`;
      return;
    }

    const products = list.map(id => getProductById(id)).filter(Boolean);
    container.innerHTML = `
      <h2>My Wishlist (${products.length})</h2>
      <div class="product-grid">${products.map(renderProductCard).join("")}</div>
    `;
  });
}
