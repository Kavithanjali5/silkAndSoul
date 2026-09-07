/* Storefront data — loaded from MongoDB via API (no demo seed) */

let PRODUCTS = [];
let CATEGORIES = [
  { id: 'all', name: 'All Sarees', image: 'images/products/saree-01.svg' },
  { id: 'banarasi', name: 'Banarasi', image: 'images/products/saree-01.svg' },
  { id: 'kanjeevaram', name: 'Kanjeevaram', image: 'images/products/saree-02.svg' },
  { id: 'silk', name: 'Silk', image: 'images/products/saree-10.svg' },
  { id: 'cotton', name: 'Cotton', image: 'images/products/saree-03.svg' },
  { id: 'designer', name: 'Designer', image: 'images/products/saree-04.svg' }
];
let OCCASIONS = [
  { id: 'wedding', name: 'Wedding' },
  { id: 'festive', name: 'Festive' },
  { id: 'party', name: 'Party' },
  { id: 'daily', name: 'Daily Wear' },
  { id: 'office', name: 'Office' }
];
let TESTIMONIALS = [];

async function loadStoreData() {
  try {
    const [products, categories, occasions] = await Promise.all([
      ProductsAPI.list(),
      MetaAPI.categories().catch(() => CATEGORIES),
      MetaAPI.occasions().catch(() => OCCASIONS)
    ]);
    PRODUCTS = Array.isArray(products) ? products : [];
    if (Array.isArray(categories) && categories.length) CATEGORIES = categories;
    if (Array.isArray(occasions) && occasions.length) OCCASIONS = occasions;
  } catch (err) {
    console.error('Failed to load store data from MongoDB API:', err);
    PRODUCTS = [];
  }
  return PRODUCTS;
}
