/** Labeled demo fixture shape shared by local and worker execution. */
export interface Product {
  id: number;
  name: string;
  description: string;
  category: string;
  price: number;
  stock: boolean;
}
/** Runtime guard used on both sides of the demo worker protocol. */
export function isProduct(value: unknown): value is Product {
  if (typeof value !== "object" || value === null) return false;
  return (
    "id" in value &&
    typeof value.id === "number" &&
    "name" in value &&
    typeof value.name === "string" &&
    "description" in value &&
    typeof value.description === "string" &&
    "category" in value &&
    typeof value.category === "string" &&
    "price" in value &&
    typeof value.price === "number" &&
    "stock" in value &&
    typeof value.stock === "boolean"
  );
}
