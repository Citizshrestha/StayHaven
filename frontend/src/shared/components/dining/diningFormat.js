// Formatting + printing helpers for restaurant bills (staff side).

export const money = (value) =>
  `Rs ${(Number(value) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const METHOD_LABELS = {
  cash: "Cash",
  card: "Card",
  esewa: "eSewa",
  khalti: "Khalti",
  bank: "Bank transfer",
  upi: "UPI / QR",
};

export const REFERENCE_METHODS = ["esewa", "khalti", "bank"];

export const tabTitle = (s) =>
  s?.type === "takeaway"
    ? `Takeaway${s.customerName ? ` · ${s.customerName}` : ""}`
    : `Table ${s?.tableNumber || "—"}`;

export const timeAgo = (value, now = Date.now()) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const min = Math.max(0, Math.floor((now - d.getTime()) / 60000));
  if (min < 1) return "just now";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return `${h} h ${min % 60} min`;
};

export const dateTime = (value) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};

export const errorText = (err, fallback = "Something went wrong") =>
  err?.response?.data?.message || err?.message || fallback;

export const esc = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const PRINT_CSS = `
  *{box-sizing:border-box} body{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;color:#000;margin:0;padding:12px;width:80mm}
  h1{font-size:15px;margin:0 0 2px;text-align:center} .c{text-align:center} .muted{color:#444}
  hr{border:0;border-top:1px dashed #000;margin:8px 0} table{width:100%;border-collapse:collapse}
  td{padding:2px 0;vertical-align:top} td.r{text-align:right;white-space:nowrap} .b{font-weight:700} .big{font-size:14px}
  @media print{@page{size:80mm auto;margin:0}}
`;

/** Writes an (already escaped) body into a print popup. Returns false if the popup was blocked. */
export const openPrintWindow = (title, body) => {
  const win = window.open("", "_blank", "width=420,height=700");
  if (!win) return false;
  win.document.open();
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${PRINT_CSS}</style></head><body>${body}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 250);
  return true;
};

/** Prints a customer bill (open tab) or receipt (closed tab). Returns false if the popup was blocked. */
export const printBill = ({ session, orders, hotel }) => {
  const t = session.totals || {};
  const closed = session.status === "closed";
  const lines = new Map();
  for (const o of orders.filter((x) => x.status !== "cancelled")) {
    for (const i of o.items || []) {
      const k = `${i.name}|${i.price}`;
      const prev = lines.get(k) || { name: i.name, price: i.price, quantity: 0 };
      prev.quantity += i.quantity;
      lines.set(k, prev);
    }
  }
  const rows = [...lines.values()]
    .map((l) => `<tr><td>${l.quantity} × ${esc(l.name)}<br><span class="muted">@ ${esc(money(l.price))}</span></td><td class="r">${esc(money(l.price * l.quantity))}</td></tr>`)
    .join("");
  const row = (label, value, cls = "") => `<tr class="${cls}"><td>${esc(label)}</td><td class="r">${esc(value)}</td></tr>`;
  const charges = session.charges || {};
  const payments = (session.payments || [])
    .map((p) => row(`${METHOD_LABELS[p.method] || p.method}${p.reference ? ` (${p.reference})` : ""}`, money(p.amount))
      + (p.change ? row("  Tendered / change", `${money(p.tendered)} / ${money(p.change)}`, "muted") : ""))
    .join("");
  const refunds = (session.refunds || [])
    .map((r) => row(`Refund · ${METHOD_LABELS[r.method] || r.method}`, `− ${money(r.amount)}`))
    .join("");

  const body = `
    <h1>${esc(hotel?.name || "Restaurant")}</h1>
    ${hotel?.address ? `<div class="c muted">${esc(hotel.address)}</div>` : ""}
    ${hotel?.phone ? `<div class="c muted">Tel ${esc(hotel.phone)}</div>` : ""}
    <hr>
    <div class="c b">${closed ? `RECEIPT #${esc(session.receiptNumber)}` : "BILL — NOT A RECEIPT"}</div>
    <div>${esc(tabTitle(session))}</div>
    <div class="muted">${esc(dateTime(closed ? session.closedAt : new Date()))}</div>
    <hr>
    <table>${rows}</table>
    <hr>
    <table>
      ${row("Subtotal", money(t.subtotal))}
      ${t.discount ? row(`Discount${session.discount?.kind === "percent" ? ` (${session.discount.value}%)` : ""}`, `− ${money(t.discount)}`) : ""}
      ${t.serviceCharge ? row(`Service charge (${charges.serviceChargeRate}%)`, money(t.serviceCharge)) : ""}
      ${row(`VAT (${charges.taxRate ?? 0}%)`, money(t.tax))}
      ${row("TOTAL", money(t.total), "b big")}
    </table>
    ${payments ? `<hr><table>${payments}${refunds}${row(closed ? "Balance" : "Balance due", money(t.balance), "b")}</table>` : ""}
    <hr>
    <div class="c">${closed ? "Thank you — please visit again" : "Please pay at the counter or ask your server"}</div>
  `;
  return openPrintWindow(closed ? `Receipt ${session.receiptNumber}` : "Bill", body);
};

export const printReport = ({ report, hotelName }) => {
  const row = (label, value, cls = "") => `<tr class="${cls}"><td>${esc(label)}</td><td class="r">${esc(value)}</td></tr>`;
  const body = `
    <h1>${esc(hotelName || "Restaurant")}</h1>
    <div class="c b">RESTAURANT DAY REPORT</div>
    <div class="c muted">${esc(dateTime(report.from))} – ${esc(dateTime(report.to))}</div>
    <hr>
    <table>
      ${row("Tabs settled", report.tabs)}
      ${row("  Dine-in / takeaway", `${report.dineIn} / ${report.takeaway}`, "muted")}
      ${row("Gross sales", money(report.subtotal))}
      ${row("Discounts", `− ${money(report.discount)}`)}
      ${row("Service charge", money(report.serviceCharge))}
      ${row("VAT collected", money(report.tax))}
      ${row("NET TOTAL", money(report.total), "b big")}
    </table>
    <hr>
    <table>
      ${report.payments.map((p) => row(`${METHOD_LABELS[p.method] || p.method} (${p.count})`, money(p.amount))
        + (p.refunded ? row("  refunded", `− ${money(p.refunded)}`, "muted") : "")
        + row("  net", money(p.net ?? p.amount), "b")).join("") || row("No payments", "")}
      ${report.payments.length ? row("NET COLLECTED", money(report.netCollected ?? 0), "b big") : ""}
    </table>
    <hr>
    <table>
      ${row("Voided tabs", report.voids)}
      ${row("Still open", `${report.open.count} · ${money(report.open.outstanding)} due`)}
    </table>
  `;
  return openPrintWindow("Day report", body);
};
