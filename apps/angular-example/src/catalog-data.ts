export interface CatalogProduct {
  id: string;
  name: string;
  description: string;
  brand: string;
  category: string;
  color: string;
  price: number;
  rating: number;
  inStock: boolean;
}

const ranges = [
  {
    category: "Electronics",
    brand: "Nova",
    names: [
      "Wireless Headphones",
      "Smartphone",
      "Laptop",
      "Bluetooth Speaker",
      "Mechanical Keyboard",
    ],
    tags: "technology audio computer rechargeable USB",
    base: 49,
  },
  {
    category: "Home & Living",
    brand: "Oakline",
    names: [
      "Desk Lamp",
      "Ergonomic Chair",
      "Standing Desk",
      "Cotton Blanket",
      "Storage Cabinet",
    ],
    tags: "home office furniture comfortable living",
    base: 29,
  },
  {
    category: "Sports & Outdoors",
    brand: "Summit",
    names: [
      "Running Shoes",
      "Hiking Backpack",
      "Yoga Mat",
      "Camping Tent",
      "Water Bottle",
    ],
    tags: "outdoor fitness training lightweight durable",
    base: 19,
  },
  {
    category: "Clothing",
    brand: "Thread",
    names: [
      "Cotton T-Shirt",
      "Rain Jacket",
      "Fleece Hoodie",
      "Denim Jeans",
      "Linen Shirt",
    ],
    tags: "clothing apparel breathable everyday casual",
    base: 15,
  },
  {
    category: "Kitchen",
    brand: "Hearth",
    names: [
      "Coffee Grinder",
      "Espresso Machine",
      "Chef Knife",
      "Ceramic Cookware",
      "Electric Kettle",
    ],
    tags: "kitchen cooking food stainless steel breakfast",
    base: 25,
  },
  {
    category: "Photography",
    brand: "Luma",
    names: [
      "Mirrorless Camera",
      "Camera Lens",
      "Travel Tripod",
      "Studio Light",
      "Camera Bag",
    ],
    tags: "photo photography video portrait professional",
    base: 69,
  },
  {
    category: "Gaming",
    brand: "Vector",
    names: [
      "Gaming Mouse",
      "Gaming Monitor",
      "Game Controller",
      "Gaming Headset",
      "Gaming Chair",
    ],
    tags: "gaming console PC esports performance",
    base: 39,
  },
  {
    category: "Personal Care",
    brand: "Bloom",
    names: [
      "Electric Toothbrush",
      "Hair Dryer",
      "Travel Grooming Kit",
      "Face Cleanser",
      "Massage Roller",
    ],
    tags: "personal care wellness daily travel",
    base: 12,
  },
] as const;
const colors = ["Midnight", "Ivory", "Forest", "Ocean", "Terracotta"] as const;
const editions = ["Essential", "Air", "Pro", "Studio", "Plus"] as const;

/** Deterministic fictional retail data: 40 product families × 250 variants. */
export function generateCatalog(): CatalogProduct[] {
  return Array.from({ length: 10_000 }, (_, index) => {
    const range = ranges[index % ranges.length]!;
    const family = Math.floor(index / ranges.length) % range.names.length;
    const variant = Math.floor(index / 40);
    const color = colors[variant % colors.length]!;
    const edition =
      editions[Math.floor(variant / colors.length) % editions.length]!;
    const model = 100 + Math.floor(variant / 25);
    const name = `${range.brand} ${range.names[family]} ${edition} ${model}`;
    return {
      id: `SKU${String(index + 1).padStart(5, "0")}`,
      name,
      description: `${name} in ${color.toLowerCase()}. Designed for ${range.tags}. Includes a two-year warranty. Variant ${variant + 1}.`,
      brand: range.brand,
      category: range.category,
      color,
      price:
        Math.round(
          (range.base + family * 37 + ((index * 17) % 1800) / 2) * 100,
        ) / 100,
      rating: Math.round((3.5 + ((index * 13) % 16) / 10) * 10) / 10,
      inStock: index % 7 !== 0,
    };
  });
}
