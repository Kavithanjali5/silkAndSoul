const STORE_NAME = "Silk & Soul";
const CURRENCY = "₹";

function formatPrice(price) {
  return CURRENCY + price.toLocaleString("en-IN");
}

function getProductById(id) {
  return PRODUCTS.find(p => String(p.id) === String(id));
}

function getEffectiveProduct(id) {
  return getProductById(id) || null;
}

function resolveImageSrc(src) {
  if (!src) return "";
  if (src.startsWith("data:") || src.startsWith("blob:") || src.startsWith("http") || src.startsWith("//")) {
    return src;
  }
  const inAdmin = /\/admin\//.test(location.pathname) || location.pathname.endsWith("/admin");
  if (inAdmin && !src.startsWith("../")) return "../" + src;
  return src;
}

function getCart() {
  return JSON.parse(localStorage.getItem("sareeCart") || "[]");
}

function saveCart(cart) {
  localStorage.setItem("sareeCart", JSON.stringify(cart));
  updateCartBadge();
}

function getWishlist() {
  return JSON.parse(localStorage.getItem("sareeWishlist") || "[]");
}

function saveWishlist(list) {
  localStorage.setItem("sareeWishlist", JSON.stringify(list));
  updateWishlistBadge();
}

function addToCart(productId, color = null, quantity = 1) {
  const product = getEffectiveProduct(productId) || getProductById(productId);
  if (!product) return;
  const cart = getCart();
  const chosenColor = color || (product.colors && product.colors[0]) || "Default";
  const key = `${productId}-${chosenColor}`;
  const existing = cart.find(item => item.key === key);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({
      key,
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      color: chosenColor,
      quantity
    });
  }
  saveCart(cart);
  showToast(`${product.name} added to cart`);
}

function removeFromCart(key) {
  saveCart(getCart().filter(item => item.key !== key));
}

function updateCartQuantity(key, quantity) {
  const cart = getCart();
  const item = cart.find(i => i.key === key);
  if (item) {
    item.quantity = Math.max(1, quantity);
    saveCart(cart);
  }
}

function getCartTotal() {
  return getCart().reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function getCartCount() {
  return getCart().reduce((sum, item) => sum + item.quantity, 0);
}

function toggleWishlist(productId) {
  let list = getWishlist();
  const key = String(productId);
  const idx = list.findIndex(id => String(id) === key);
  if (idx > -1) {
    list.splice(idx, 1);
    showToast("Removed from wishlist");
  } else {
    list.push(key);
    showToast("Added to wishlist ♥");
  }
  saveWishlist(list);
  return list.some(id => String(id) === key);
}

function isInWishlist(productId) {
  return getWishlist().some(id => String(id) === String(productId));
}

function updateCartBadge() {
  const badges = document.querySelectorAll(".cart-count");
  const count = getCartCount();
  badges.forEach(b => {
    b.textContent = count;
    b.style.display = count > 0 ? "flex" : "none";
  });
}

function updateWishlistBadge() {
  const badges = document.querySelectorAll(".wishlist-count");
  const count = getWishlist().length;
  badges.forEach(b => {
    b.textContent = count;
    b.style.display = count > 0 ? "flex" : "none";
  });
}

function showToast(message) {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove("show"), 2500);
}

function renderStars(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  let stars = "";
  for (let i = 0; i < full; i++) stars += "★";
  if (half) stars += "½";
  while (stars.length < 5) stars += "☆";
  return stars.slice(0, 5);
}

function renderProductCard(product) {
  const p = getEffectiveProduct(product.id) || product;
  const discount = p.originalPrice
    ? Math.round((1 - p.price / p.originalPrice) * 100)
    : 0;
  const wishlisted = isInWishlist(p.id);
  const img = resolveImageSrc(p.image);
  const pid = JSON.stringify(String(p.id));
  return `
    <article class="product-card" data-id="${p.id}">
      <div class="product-image-wrap">
        ${p.new ? '<span class="badge badge-new">New</span>' : ""}
        ${discount > 0 ? `<span class="badge badge-sale">-${discount}%</span>` : ""}
        <button class="wishlist-btn ${wishlisted ? "active" : ""}" onclick='event.preventDefault(); toggleWishlist(${pid}); this.classList.toggle("active")' aria-label="Wishlist">
          ♥
        </button>
        <button type="button" class="tryon-hotspot" onclick='openTryOn(${pid}, event)' title="AI Try-On — see it worn">
          <img src="${img}" alt="${p.name}" loading="lazy">
          <span class="tryon-hint">✦ AI Try-On</span>
        </button>
        <div class="product-overlay">
          <button type="button" class="btn btn-sm btn-gold" onclick='openTryOn(${pid}, event)'>See Worn</button>
          <a href="product.html?id=${encodeURIComponent(p.id)}" class="btn btn-sm">Quick View</a>
          <button class="btn btn-sm btn-primary" onclick='addToCart(${pid})'>Add to Cart</button>
        </div>
      </div>
      <div class="product-info">
        <span class="product-category">${p.category}</span>
        <h3><a href="product.html?id=${encodeURIComponent(p.id)}">${p.name}</a></h3>
        <div class="product-rating">${renderStars(p.rating || 0)} <span>(${p.reviews || 0})</span></div>
        <div class="product-price">
          <span class="price-current">${formatPrice(p.price)}</span>
          ${p.originalPrice ? `<span class="price-original">${formatPrice(p.originalPrice)}</span>` : ""}
        </div>
      </div>
    </article>
  `;
}

function renderHeader(activePage = "") {
  return `
    <header class="header">
      <div class="top-bar">
        <p>✦ Free shipping on orders above ₹5,000 &nbsp;|&nbsp; COD Available &nbsp;|&nbsp; 100% Authentic Handloom ✦</p>
      </div>
      <nav class="navbar">
        <a href="index.html" class="logo">
          <span class="logo-mark">
            <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="#C9A962" stroke-width="1.5"/><path d="M12 6 L13 11 L12 12 L11 11 Z" fill="#C9A962"/><circle cx="12" cy="12" r="2" fill="#C9A962"/></svg>
          </span>
          <span class="logo-text">${STORE_NAME}</span>
        </a>
        <button class="mobile-toggle" aria-label="Menu" aria-controls="navLinks" aria-expanded="false" onclick="toggleMobileMenu()">
          <span></span><span></span><span></span>
        </button>
        <ul class="nav-links" id="navLinks">
          <li><a href="index.html" class="${activePage === "home" ? "active" : ""}">Home</a></li>
          <li><a href="shop.html" class="${activePage === "shop" ? "active" : ""}">Shop</a></li>
          <li><a href="shop.html?category=banarasi">Banarasi</a></li>
          <li><a href="shop.html?category=kanjeevaram">Kanjeevaram</a></li>
          <li><a href="about.html" class="${activePage === "about" ? "active" : ""}">About</a></li>
          <li><a href="contact.html" class="${activePage === "contact" ? "active" : ""}">Contact</a></li>
        </ul>
        <div class="nav-actions">
          <div class="search-box">
            <input type="search" id="headerSearch" placeholder="Search sarees..." onkeydown="if(event.key==='Enter') window.location.href='shop.html?search='+encodeURIComponent(this.value)">
            <button onclick="const q=document.getElementById('headerSearch').value; if(q) window.location.href='shop.html?search='+encodeURIComponent(q)" aria-label="Search">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
          </div>
          <a href="wishlist.html" class="nav-icon" aria-label="Wishlist">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            <span class="wishlist-count badge-count">0</span>
          </a>
          <a href="cart.html" class="nav-icon" aria-label="Cart">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            <span class="cart-count badge-count">0</span>
          </a>
        </div>
      </nav>
    </header>
  `;
}

function renderFooter() {
  return `
    <footer class="footer">
      <div class="footer-grid">
        <div class="footer-brand">
          <h3>${STORE_NAME}</h3>
          <p>Curating India's finest handwoven sarees since 2010. Authentic silk, cotton, and designer collections delivered to your doorstep.</p>
          <div class="social-links">
            <a href="#" aria-label="Instagram">📷</a>
            <a href="#" aria-label="Facebook">📘</a>
            <a href="#" aria-label="WhatsApp">💬</a>
            <a href="#" aria-label="Pinterest">📌</a>
          </div>
        </div>
        <div class="footer-links">
          <h4>Shop</h4>
          <ul>
            <li><a href="shop.html">All Sarees</a></li>
            <li><a href="shop.html?category=banarasi">Banarasi</a></li>
            <li><a href="shop.html?category=kanjeevaram">Kanjeevaram</a></li>
            <li><a href="shop.html?category=silk">Silk</a></li>
            <li><a href="shop.html?category=cotton">Cotton</a></li>
            <li><a href="shop.html?category=designer">Designer</a></li>
          </ul>
        </div>
        <div class="footer-links">
          <h4>Help</h4>
          <ul>
            <li><a href="contact.html">Contact Us</a></li>
            <li><a href="#">Shipping Policy</a></li>
            <li><a href="#">Return Policy</a></li>
            <li><a href="#">Size Guide</a></li>
            <li><a href="#">FAQ</a></li>
            <li><a href="admin/index.html">Admin Panel</a></li>
          </ul>
        </div>
        <div class="footer-newsletter">
          <h4>Newsletter</h4>
          <p>Get exclusive offers and new arrivals</p>
          <form class="newsletter-form" onsubmit="event.preventDefault(); showToast('Thank you for subscribing!'); this.reset();">
            <input type="email" placeholder="Your email" required>
            <button type="submit" class="btn btn-gold btn-sm">Subscribe</button>
          </form>
        </div>
      </div>
      <div class="footer-bottom">
        <p>&copy; 2026 ${STORE_NAME}. All rights reserved.</p>
        <div class="payment-icons">
          <span>UPI</span><span>Visa</span><span>Mastercard</span><span>COD</span>
        </div>
      </div>
    </footer>
  `;
}

function toggleMobileMenu() {
  const open = document.getElementById("navLinks")?.classList.toggle("open");
  document.querySelector(".mobile-toggle")?.setAttribute("aria-expanded", String(!!open));
}

function initPage(activePage) {
  const headerEl = document.getElementById("site-header");
  const footerEl = document.getElementById("site-footer");
  if (headerEl) headerEl.innerHTML = renderHeader(activePage);
  if (footerEl) footerEl.innerHTML = renderFooter();
  updateCartBadge();
  updateWishlistBadge();
}

document.addEventListener("DOMContentLoaded", () => {
  updateCartBadge();
  updateWishlistBadge();
});
