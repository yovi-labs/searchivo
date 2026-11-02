export interface Product {
  id: number;
  name: string;
  text: string;
  category: string;
  price: number;
}
export const products: Product[] = [
  {
    id: 1,
    name: "Apple iPhone",
    text: "premium phone camera",
    category: "Phones",
    price: 999,
  },
  {
    id: 2,
    name: "Google Pixel",
    text: "android phone camera",
    category: "Phones",
    price: 699,
  },
  {
    id: 3,
    name: "Apple MacBook",
    text: "light laptop computer",
    category: "Computers",
    price: 1299,
  },
  {
    id: 4,
    name: "Framework Laptop",
    text: "repairable laptop computer",
    category: "Computers",
    price: 1099,
  },
];
export function isProduct(value: unknown): value is Product {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item["id"] === "number" &&
    Number.isFinite(item["id"]) &&
    typeof item["name"] === "string" &&
    typeof item["text"] === "string" &&
    typeof item["category"] === "string" &&
    typeof item["price"] === "number"
  );
}
