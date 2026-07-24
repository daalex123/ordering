import { format } from "date-fns";
import { formatMoney, ORDER_STATUS_LABELS, type OrderWithItems } from "@/types/database";
import { orderTicketLabel } from "@/lib/admin-order-ui";
import { formatAddress } from "@/lib/admin-order-flow";

/** Opens a clean kitchen ticket print window for one order. */
export function printOrderTicket(order: OrderWithItems) {
  const address = formatAddress(order.delivery_address);
  const ticket = orderTicketLabel(order);
  const items = order.order_items
    .map(
      (item) =>
        `<tr>
          <td style="padding:6px 0;vertical-align:top;font-weight:700;width:2.5rem">${item.quantity}×</td>
          <td style="padding:6px 0">
            ${escapeHtml(item.product_name)}
            ${item.notes ? `<div style="color:#666;font-size:12px">${escapeHtml(item.notes)}</div>` : ""}
          </td>
          <td style="padding:6px 0;text-align:right;white-space:nowrap">${formatMoney(Number(item.unit_price) * item.quantity)}</td>
        </tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Ticket #${ticket}</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, sans-serif; color: #1a1a1a; margin: 24px; max-width: 360px; }
    h1 { font-size: 18px; margin: 0 0 4px; }
    .meta { color: #555; font-size: 12px; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    .total { font-size: 18px; font-weight: 800; margin-top: 12px; }
    .note { margin-top: 12px; padding: 8px; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; font-size: 13px; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <h1>#${ticket} · ${escapeHtml(order.customer_name || "Customer")}</h1>
  <div class="meta">
    ${escapeHtml(order.customer_phone)}<br/>
    ${format(new Date(order.created_at), "MMM d · h:mm a")} ·
    ${escapeHtml(order.fulfillment_type.replace("_", " "))} ·
    ${escapeHtml(ORDER_STATUS_LABELS[order.status])}<br/>
    Pay: ${escapeHtml(order.payment_method.replace(/_/g, " "))}
    ${address ? `<br/>${escapeHtml(address)}` : ""}
  </div>
  <table>${items}</table>
  <div class="total">${formatMoney(Number(order.total))}</div>
  ${order.notes ? `<div class="note"><strong>Note:</strong> ${escapeHtml(order.notes)}</div>` : ""}
  <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 300); };</script>
</body>
</html>`;

  const win = window.open("", "_blank", "noopener,noreferrer,width=420,height=640");
  if (!win) {
    window.print();
    return;
  }
  win.document.write(html);
  win.document.close();
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
