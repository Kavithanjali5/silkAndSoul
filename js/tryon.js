/* AI Virtual Try-On — Silk & Soul */

const TRYON_MODELS = [
  { id: "classic", label: "Classic", prompt: "elegant Indian woman standing gracefully, soft studio light" },
  { id: "bridal", label: "Bridal", prompt: "beautiful Indian bride, warm festive lighting, jewellery" },
  { id: "modern", label: "Modern", prompt: "young Indian woman, contemporary fashion pose, clean backdrop" },
  { id: "festive", label: "Festive", prompt: "Indian woman at celebration, joyful expression, soft bokeh" }
];

function ensureTryOnModal() {
  if (document.getElementById("tryOnModal")) return;
  const el = document.createElement("div");
  el.id = "tryOnModal";
  el.className = "tryon-overlay";
  el.innerHTML = `
    <div class="tryon-modal" role="dialog" aria-modal="true" aria-labelledby="tryOnTitle">
      <button class="tryon-close" onclick="closeTryOn()" aria-label="Close">×</button>
      <div class="tryon-header">
        <p class="tryon-eyebrow">✦ AI Virtual Try-On</p>
        <h2 id="tryOnTitle">See it worn</h2>
        <p class="tryon-sub" id="tryOnSub">Generating a realistic look with this saree</p>
      </div>
      <div class="tryon-body">
        <div class="tryon-stage">
          <div class="tryon-loading" id="tryOnLoading">
            <div class="tryon-spinner"></div>
            <p id="tryOnStatus">AI is draping the saree…</p>
            <div class="tryon-progress"><span id="tryOnBar"></span></div>
          </div>
          <img id="tryOnResult" class="tryon-result" alt="Try-on preview" hidden>
          <canvas id="tryOnCanvas" class="tryon-result" hidden></canvas>
          <div class="tryon-compare" id="tryOnCompare" hidden>
            <div>
              <span>Original</span>
              <img id="tryOnOriginal" alt="Saree">
            </div>
          </div>
        </div>
        <div class="tryon-side">
          <div class="tryon-models" id="tryOnModels"></div>
          <div class="tryon-upload">
            <label>Or try with your photo</label>
            <div class="tryon-upload-row">
              <label class="btn btn-outline btn-sm" for="tryOnSelfie">Upload selfie</label>
              <input type="file" id="tryOnSelfie" accept="image/*" capture="user" hidden>
            </div>
            <small>Optional — AI blends the saree look with your photo style</small>
          </div>
          <div class="tryon-actions">
            <button class="btn btn-primary" id="tryOnRegen" type="button">Regenerate Look</button>
            <button class="btn btn-outline" id="tryOnDownload" type="button" hidden>Download</button>
            <a class="btn btn-gold" id="tryOnShop" href="#">View Product</a>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(el);
  el.addEventListener("click", (e) => { if (e.target === el) closeTryOn(); });
  document.getElementById("tryOnSelfie").addEventListener("change", onTryOnSelfie);
  document.getElementById("tryOnRegen").addEventListener("click", () => regenerateTryOn());
  document.getElementById("tryOnDownload").addEventListener("click", downloadTryOn);
}

let tryOnState = {
  product: null,
  modelId: "classic",
  selfieDataUrl: null
};

function openTryOn(productId, event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  ensureTryOnModal();
  const product = typeof getEffectiveProduct === "function"
    ? getEffectiveProduct(productId)
    : (typeof getProductById === "function" ? getProductById(productId) : null);
  if (!product) return;

  tryOnState = { product, modelId: "classic", selfieDataUrl: null };
  document.getElementById("tryOnTitle").textContent = product.name;
  document.getElementById("tryOnSub").textContent = `${(product.colors || []).slice(0, 2).join(" · ") || product.fabric} · AI preview`;
  document.getElementById("tryOnShop").href = `product.html?id=${product.id}`;
  document.getElementById("tryOnOriginal").src = resolveImageSrc(product.image);
  document.getElementById("tryOnSelfie").value = "";

  const modelsEl = document.getElementById("tryOnModels");
  modelsEl.innerHTML = TRYON_MODELS.map(m => `
    <button type="button" class="tryon-model-btn ${m.id === "classic" ? "active" : ""}" data-model="${m.id}">
      ${m.label}
    </button>
  `).join("");
  modelsEl.querySelectorAll(".tryon-model-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      modelsEl.querySelectorAll(".tryon-model-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      tryOnState.modelId = btn.dataset.model;
      regenerateTryOn();
    });
  });

  document.getElementById("tryOnModal").classList.add("open");
  document.body.style.overflow = "hidden";
  regenerateTryOn();
}

function closeTryOn() {
  const modal = document.getElementById("tryOnModal");
  if (modal) modal.classList.remove("open");
  document.body.style.overflow = "";
}

function onTryOnSelfie(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    compressImageFile(file, 720).then(dataUrl => {
      tryOnState.selfieDataUrl = dataUrl;
      regenerateTryOn();
    }).catch(() => {
      tryOnState.selfieDataUrl = reader.result;
      regenerateTryOn();
    });
  };
  reader.readAsDataURL(file);
}

function setTryOnLoading(on, msg) {
  const loading = document.getElementById("tryOnLoading");
  const result = document.getElementById("tryOnResult");
  const canvas = document.getElementById("tryOnCanvas");
  const compare = document.getElementById("tryOnCompare");
  const download = document.getElementById("tryOnDownload");
  if (on) {
    loading.hidden = false;
    result.hidden = true;
    canvas.hidden = true;
    compare.hidden = true;
    download.hidden = true;
    document.getElementById("tryOnStatus").textContent = msg || "AI is draping the saree…";
    const bar = document.getElementById("tryOnBar");
    bar.style.width = "8%";
    let w = 8;
    clearInterval(loading._timer);
    loading._timer = setInterval(() => {
      w = Math.min(92, w + Math.random() * 12);
      bar.style.width = w + "%";
    }, 400);
  } else {
    clearInterval(loading._timer);
    document.getElementById("tryOnBar").style.width = "100%";
    loading.hidden = true;
  }
}

function buildTryOnPrompt(product, model) {
  const colors = (product.colors || []).join(" and ") || "rich traditional colors";
  const fabric = product.fabric || "silk";
  const name = product.name || "handwoven saree";
  let prompt = `Photorealistic full-body fashion photo of ${model.prompt}, wearing a beautiful ${colors} ${fabric} Indian saree similar to ${name}, elegant drape, pallu over shoulder, natural pose, high detail fabric texture, professional photography, 85mm lens`;
  if (tryOnState.selfieDataUrl) {
    prompt += `, face resembling the uploaded customer selfie style, same age appearance`;
  }
  return prompt;
}

async function regenerateTryOn() {
  const product = tryOnState.product;
  if (!product) return;
  const model = TRYON_MODELS.find(m => m.id === tryOnState.modelId) || TRYON_MODELS[0];
  setTryOnLoading(true, "AI is draping the saree on a model…");

  const prompt = buildTryOnPrompt(product, model);
  const seed = Math.floor(Math.random() * 99999);
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=640&height=960&nologo=true&seed=${seed}&enhance=true`;

  try {
    const img = document.getElementById("tryOnResult");
    await loadImageWithTimeout(url, 28000);
    img.src = url;
    img.hidden = false;
    document.getElementById("tryOnCanvas").hidden = true;
    document.getElementById("tryOnCompare").hidden = false;
    document.getElementById("tryOnDownload").hidden = false;
    setTryOnLoading(false);
    if (typeof showToast === "function") showToast("AI try-on ready ✦");
  } catch (err) {
    setTryOnLoading(true, "Creating local try-on preview…");
    await renderLocalTryOn(product);
    setTryOnLoading(false);
    if (typeof showToast === "function") showToast("Showing studio preview");
  }
}

function loadImageWithTimeout(src, ms) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const t = setTimeout(() => {
      img.src = "";
      reject(new Error("timeout"));
    }, ms);
    img.onload = () => { clearTimeout(t); resolve(img); };
    img.onerror = () => { clearTimeout(t); reject(new Error("failed")); };
    img.src = src;
  });
}

function loadImg(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function renderLocalTryOn(product) {
  const canvas = document.getElementById("tryOnCanvas");
  const ctx = canvas.getContext("2d");
  const W = 480;
  const H = 720;
  canvas.width = W;
  canvas.height = H;

  const sareeSrc = resolveImageSrc(product.image);
  let sareeImg;
  try {
    sareeImg = await loadImg(sareeSrc);
  } catch {
    sareeImg = null;
  }

  // Soft studio background
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#F7EFE6");
  bg.addColorStop(0.5, "#EAD9C8");
  bg.addColorStop(1, "#D4C0A8");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Soft light orbs
  ctx.fillStyle = "rgba(201,169,98,0.18)";
  ctx.beginPath(); ctx.arc(90, 120, 100, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(123,30,58,0.1)";
  ctx.beginPath(); ctx.arc(400, 580, 120, 0, Math.PI * 2); ctx.fill();

  // Selfie as face reference (circular crop at head)
  if (tryOnState.selfieDataUrl) {
    try {
      const selfie = await loadImg(tryOnState.selfieDataUrl);
      ctx.save();
      ctx.beginPath();
      ctx.arc(W / 2, 118, 52, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      const size = Math.min(selfie.width, selfie.height);
      const sx = (selfie.width - size) / 2;
      const sy = (selfie.height - size) / 2;
      ctx.drawImage(selfie, sx, sy, size, size, W / 2 - 52, 66, 104, 104);
      ctx.restore();
    } catch (_) {}
  } else {
    // Stylized head
    ctx.fillStyle = "#C4A484";
    ctx.beginPath();
    ctx.ellipse(W / 2, 118, 42, 50, 0, 0, Math.PI * 2);
    ctx.fill();
    // Hair
    ctx.fillStyle = "#2A1A12";
    ctx.beginPath();
    ctx.ellipse(W / 2, 100, 48, 40, 0, Math.PI, 0);
    ctx.fill();
  }

  // Neck / shoulders
  ctx.fillStyle = "#C4A484";
  ctx.beginPath();
  ctx.moveTo(W / 2 - 18, 160);
  ctx.lineTo(W / 2 + 18, 160);
  ctx.lineTo(W / 2 + 28, 200);
  ctx.lineTo(W / 2 - 28, 200);
  ctx.closePath();
  ctx.fill();

  // Saree body drape region with product texture
  const drapeX = 90;
  const drapeY = 190;
  const drapeW = 300;
  const drapeH = 480;

  ctx.save();
  // Body silhouette path
  ctx.beginPath();
  ctx.moveTo(W / 2 - 70, drapeY);
  ctx.quadraticCurveTo(W / 2 - 110, drapeY + 80, W / 2 - 95, drapeY + 200);
  ctx.quadraticCurveTo(W / 2 - 100, drapeY + 360, W / 2 - 55, drapeY + 470);
  ctx.lineTo(W / 2 + 55, drapeY + 470);
  ctx.quadraticCurveTo(W / 2 + 100, drapeY + 360, W / 2 + 95, drapeY + 200);
  ctx.quadraticCurveTo(W / 2 + 110, drapeY + 80, W / 2 + 70, drapeY);
  ctx.closePath();
  ctx.clip();

  if (sareeImg) {
    ctx.globalAlpha = 0.95;
    ctx.drawImage(sareeImg, drapeX - 20, drapeY, drapeW + 40, drapeH);
    // Soft overlay for fabric depth
    const shade = ctx.createLinearGradient(drapeX, drapeY, drapeX + drapeW, drapeY + drapeH);
    shade.addColorStop(0, "rgba(30,16,8,0.15)");
    shade.addColorStop(0.4, "rgba(255,255,255,0.08)");
    shade.addColorStop(1, "rgba(30,16,8,0.25)");
    ctx.fillStyle = shade;
    ctx.fillRect(drapeX - 20, drapeY, drapeW + 40, drapeH);
  } else {
    const colors = product.colors || ["Maroon", "Gold"];
    ctx.fillStyle = colorNameToHex(colors[0]);
    ctx.fillRect(drapeX, drapeY, drapeW, drapeH);
  }
  ctx.restore();

  // Pallu over shoulder
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(W / 2 + 20, 185);
  ctx.quadraticCurveTo(W / 2 + 140, 220, W / 2 + 120, 420);
  ctx.quadraticCurveTo(W / 2 + 100, 520, W / 2 + 40, 560);
  ctx.quadraticCurveTo(W / 2 + 90, 400, W / 2 + 50, 210);
  ctx.closePath();
  ctx.clip();
  if (sareeImg) {
    ctx.drawImage(sareeImg, W / 2, 180, 180, 400);
  } else {
    ctx.fillStyle = colorNameToHex((product.colors || [])[1] || "Gold");
    ctx.fillRect(W / 2, 180, 180, 400);
  }
  ctx.restore();

  // Arms hint
  ctx.strokeStyle = "rgba(196,164,132,0.9)";
  ctx.lineWidth = 22;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(W / 2 - 72, 210);
  ctx.quadraticCurveTo(W / 2 - 130, 300, W / 2 - 100, 380);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(W / 2 + 72, 210);
  ctx.quadraticCurveTo(W / 2 + 130, 300, W / 2 + 95, 360);
  ctx.stroke();

  // Label
  ctx.fillStyle = "rgba(30,16,8,0.55)";
  ctx.font = "500 13px Outfit, sans-serif";
  ctx.fillText("Studio try-on preview · " + product.name, 24, H - 24);

  canvas.hidden = false;
  document.getElementById("tryOnResult").hidden = true;
  document.getElementById("tryOnCompare").hidden = false;
  document.getElementById("tryOnDownload").hidden = false;
}

function colorNameToHex(name) {
  const map = {
    maroon: "#7B1E3A", gold: "#C9A962", emerald: "#2D6A4F", red: "#B83227",
    pink: "#D4849A", peach: "#E8B4A0", lavender: "#9B8EC4", wine: "#6B1D3A",
    navy: "#1B3A5F", black: "#1A1A1A", white: "#F5F0E8", blue: "#3A6B9A",
    green: "#3D6B4F", beige: "#D4C4A8", brown: "#6B4423", rust: "#A0522D",
    cream: "#F5EDE0", grey: "#8A8580", olive: "#6B7A4A", purple: "#5C3A6E",
    yellow: "#E8C84A", orange: "#D4783A", mint: "#8FBC9A", blush: "#E8A0B0", ivory: "#FFFFF0"
  };
  return map[String(name || "").toLowerCase()] || "#7B1E3A";
}

function downloadTryOn() {
  const result = document.getElementById("tryOnResult");
  const canvas = document.getElementById("tryOnCanvas");
  const name = (tryOnState.product?.name || "tryon").replace(/\s+/g, "-").toLowerCase();
  if (!result.hidden && result.src) {
    const a = document.createElement("a");
    a.href = result.src;
    a.download = `silk-soul-tryon-${name}.jpg`;
    a.target = "_blank";
    a.click();
    return;
  }
  if (!canvas.hidden) {
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `silk-soul-tryon-${name}.png`;
    a.click();
  }
}

/** Compress uploaded image for localStorage */
function compressImageFile(file, maxSize = 900, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        const scale = Math.min(1, maxSize / Math.max(width, height));
        width = Math.round(width * scale);
        height = Math.round(height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeTryOn();
});
