/* Storefront data — loaded from MongoDB via API (no demo seed) */

let PRODUCTS = [];
let CATEGORIES = [
  { id: 'all', name: 'All Sarees', image: 'attachments/d3854ad5-e75c-474c-be77-c63736462241.JPG' },
  { id: 'banarasi', name: 'Banarasi', image: 'attachments/d3854ad5-e75c-474c-be77-c63736462241.JPG' },
  { id: 'kanjeevaram', name: 'Kanjeevaram', image: 'attachments/2593f2b0-8cb8-46f0-9ee3-800c311fcf1b.JPG' },
  { id: 'silk', name: 'Silk', image: 'attachments/ea5f8825-002f-478d-9bd9-626d8cb3968e.JPG' },
  { id: 'cotton', name: 'Cotton', image: 'attachments/f4e3f845-3f5f-4bdc-944b-725ca9481c26.JPG' },
  { id: 'designer', name: 'Designer', image: 'attachments/71d27dfb-7f35-4ed8-9808-939fafa44951.JPG' }
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
