import axios from 'axios';

interface ProductInfo {
  name: string;
  brand?: string;
  category?: string;
  imageUrl?: string;
  found: boolean;
}

export async function lookupBarcode(barcode: string): Promise<ProductInfo> {
  try {
    // Use Open Food Facts API (free, no API key required)
    const response = await axios.get(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
      { timeout: 5000 }
    );

    if (response.data.status === 1 && response.data.product) {
      const product = response.data.product;

      // Get the product name, falling back to various fields
      const name = product.product_name ||
                   product.product_name_en ||
                   product.generic_name ||
                   'Unknown Product';

      // Try to determine a category for grocery sorting
      let category: string | undefined;
      const categories = (product.categories_tags || []).join(' ').toLowerCase();

      if (categories.includes('beverage') || categories.includes('drink')) {
        category = 'Beverages';
      } else if (categories.includes('dairy') || categories.includes('milk') || categories.includes('cheese')) {
        category = 'Dairy';
      } else if (categories.includes('meat') || categories.includes('seafood') || categories.includes('fish')) {
        category = 'Meat & Seafood';
      } else if (categories.includes('snack') || categories.includes('chip') || categories.includes('candy')) {
        category = 'Snacks';
      } else if (categories.includes('frozen')) {
        category = 'Frozen';
      } else if (categories.includes('bread') || categories.includes('bakery')) {
        category = 'Bakery';
      } else if (categories.includes('produce') || categories.includes('fruit') || categories.includes('vegetable')) {
        category = 'Produce';
      } else if (categories.includes('household') || categories.includes('cleaning')) {
        category = 'Household';
      } else if (categories.includes('personal') || categories.includes('hygiene') || categories.includes('beauty')) {
        category = 'Personal Care';
      } else {
        category = 'Pantry'; // Default for food items
      }

      return {
        name: product.brands ? `${product.brands} ${name}` : name,
        brand: product.brands,
        category,
        imageUrl: product.image_small_url || product.image_url,
        found: true,
      };
    }

    return { name: '', found: false };
  } catch (error) {
    console.error('Barcode lookup error:', error);
    return { name: '', found: false };
  }
}
