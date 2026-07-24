export type UserRole = "customer" | "staff" | "admin";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "completed"
  | "cancelled";

export type FulfillmentType = "pickup" | "delivery";
export type PaymentMethod = "cod" | "pay_at_pickup";

export type Address = {
  line1: string;
  line2?: string;
  city: string;
  notes?: string;
};

export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  default_address: Address | null;
  created_at: string;
  updated_at: string;
};

export type RestaurantSettings = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  is_open: boolean;
  hours: Record<string, string>;
  delivery_enabled: boolean;
  delivery_fee: number;
  min_order: number;
  eta_text: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  tagline: string | null;
  primary_color: string;
  primary_foreground: string;
  accent_color: string;
  background_color: string;
  surface_color: string;
  created_at: string;
  updated_at: string;
};

export const DEFAULT_BRANDING = {
  name: "Kings Bakamuna",
  logo_url: "/logo-kings-bakamuna.png" as string | null,
  favicon_url: "/logo-kings-bakamuna.png" as string | null,
  tagline: "Restaurant & Billiards",
  primary_color: "#E95322",
  primary_foreground: "#ffffff",
  accent_color: "#F5CB58",
  background_color: "#F5F5F5",
  surface_color: "#FFDECF",
};

export type Category = {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Product = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type Order = {
  id: string;
  user_id: string;
  status: OrderStatus;
  fulfillment_type: FulfillmentType;
  delivery_address: Address | null;
  customer_phone: string;
  customer_name: string | null;
  payment_method: PaymentMethod;
  subtotal: number;
  delivery_fee: number;
  total: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  unit_price: number;
  quantity: number;
  notes: string | null;
  created_at: string;
};

export type OrderWithItems = Order & {
  order_items: OrderItem[];
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  out_for_delivery: "Out for delivery",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "out_for_delivery",
  "completed",
];

export function formatMoney(amount: number, currency = "LKR") {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}
