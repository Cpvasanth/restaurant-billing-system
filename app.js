// Data keys
const STORAGE_KEYS = {
	menu: "rb_menu_items_v1",
	cart: "rb_cart_v1",
	sales: "rb_sales_v1",
	upi: "rb_upi_id_v1"
};

// Default menu with images (royalty-free placeholders)
const DEFAULT_MENU = [
	{ id: cryptoRandomId(), name: "Tea", price: 12, category: "Beverages", image: "https://images.unsplash.com/photo-1511920170033-f8396924c348?q=80&w=800&auto=format&fit=crop" },
	{ id: cryptoRandomId(), name: "Coffee", price: 20, category: "Beverages", image: "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?q=80&w=800&auto=format&fit=crop" },
	{ id: cryptoRandomId(), name: "Idly", price: 30, category: "Breakfast", image: "https://images.unsplash.com/photo-1650969989486-54b1be3e0c11?q=80&w=800&auto=format&fit=crop" },
	{ id: cryptoRandomId(), name: "Dosa", price: 50, category: "Breakfast", image: "https://images.unsplash.com/photo-1596797038530-2c107229f796?q=80&w=800&auto=format&fit=crop" },
	{ id: cryptoRandomId(), name: "Poori", price: 45, category: "Breakfast", image: "https://images.unsplash.com/photo-1726800555357-1a492df6e5e7?q=80&w=800&auto=format&fit=crop" },
	{ id: cryptoRandomId(), name: "Pongal", price: 40, category: "Breakfast", image: "https://images.unsplash.com/photo-1535241749838-299277b6305f?q=80&w=800&auto=format&fit=crop" },
	{ id: cryptoRandomId(), name: "Vada", price: 25, category: "Snacks", image: "https://images.unsplash.com/photo-1668230558884-b88d62df9355?q=80&w=800&auto=format&fit=crop" }
];

// In-memory state
let menuItems = loadFromStorage(STORAGE_KEYS.menu, DEFAULT_MENU);
let cartItems = loadFromStorage(STORAGE_KEYS.cart, []);
let sales = loadFromStorage(STORAGE_KEYS.sales, []); // array of orders
let upiIdStored = loadFromStorage(STORAGE_KEYS.upi, "");
let currentInvoiceOrder = null;

// App init
document.addEventListener("DOMContentLoaded", () => {
	initNavigation();
	initMenuView();
	initCartActions();
	initManageView();
	initReportsView();
	initInvoicesView();
	renderMenu();
	renderCart();
});

// Navigation
function initNavigation() {
	const buttons = document.querySelectorAll(".nav-btn");
	buttons.forEach((btn) => {
		btn.addEventListener("click", () => {
			const view = btn.getAttribute("data-view");
			switchView(view);
		});
	});
}
function switchView(view) {
	document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
	document.querySelector(`#view-${view}`).classList.add("active");
}

// Menu rendering and interactions
function initMenuView() {
	const search = document.getElementById("menu-search");
	search.addEventListener("input", renderMenu);
}
function renderMenu() {
	const grid = document.getElementById("menu-grid");
	const q = document.getElementById("menu-search").value.trim().toLowerCase();
	const filtered = menuItems.filter((m) => m.name.toLowerCase().includes(q) || (m.category || "").toLowerCase().includes(q));
	if (filtered.length === 0) {
		grid.innerHTML = `<div style="color: var(--muted); padding: 12px;">No items found.</div>`;
		return;
	}
	grid.innerHTML = filtered.map((m) => `
		<div class="card">
			<img src="${escapeHtml(m.image)}" alt="${escapeHtml(m.name)}" onerror="this.src='https://placehold.co/600x400?text=${encodeURIComponent(m.name)}'"/>
			<div class="card-body">
				<div>
					<div class="card-title">${escapeHtml(m.name)}</div>
					<div class="muted" style="color: var(--muted); font-size: 12px;">${escapeHtml(m.category || "")}</div>
				</div>
				<div class="price">₹${formatMoney(m.price)}</div>
				<button class="add-btn" data-id="${m.id}">Add</button>
			</div>
		</div>
	`).join("");
	grid.querySelectorAll(".add-btn").forEach((btn) => {
		btn.addEventListener("click", () => {
			const id = btn.getAttribute("data-id");
			const item = menuItems.find((x) => x.id === id);
			if (!item) return;
			addToCart(item.id, 1);
		});
	});
}

// Cart
function initCartActions() {
	document.getElementById("clear-cart").addEventListener("click", () => {
		if (cartItems.length === 0) return;
		if (confirm("Clear cart?")) {
			cartItems = [];
			saveToStorage(STORAGE_KEYS.cart, cartItems);
			renderCart();
		}
	});
	document.getElementById("pay-now").addEventListener("click", onPayNow);
}
function addToCart(menuId, qty) {
	const menuItem = menuItems.find((m) => m.id === menuId);
	if (!menuItem) return;
	const existing = cartItems.find((c) => c.menuId === menuId);
	if (existing) {
		existing.qty += qty;
	} else {
		cartItems.push({ menuId, name: menuItem.name, price: menuItem.price, qty });
	}
	saveToStorage(STORAGE_KEYS.cart, cartItems);
	renderCart();
}
function updateQty(menuId, qty) {
	const item = cartItems.find((c) => c.menuId === menuId);
	if (!item) return;
	item.qty = Math.max(1, qty);
	saveToStorage(STORAGE_KEYS.cart, cartItems);
	renderCart();
}
function removeFromCart(menuId) {
	cartItems = cartItems.filter((c) => c.menuId !== menuId);
	saveToStorage(STORAGE_KEYS.cart, cartItems);
	renderCart();
}
function calcTotals() {
	const subtotal = cartItems.reduce((sum, it) => sum + it.price * it.qty, 0);
	// Tax removed as requested
	const tax = 0;
	const grand = +(subtotal + tax).toFixed(2);
	return { subtotal, tax, grand };
}
function renderCart() {
	const list = document.getElementById("cart-items");
	if (cartItems.length === 0) {
		list.innerHTML = `<div style="color: var(--muted); padding: 8px;">Cart is empty.</div>`;
	} else {
		list.innerHTML = cartItems.map((c) => `
			<div class="cart-item">
				<div><strong>${escapeHtml(c.name)}</strong><div style="color: var(--muted); font-size: 12px;">₹${formatMoney(c.price)}</div></div>
				<div class="qty">
					<button data-act="dec" data-id="${c.menuId}">−</button>
					<input type="number" min="1" value="${c.qty}" data-id="${c.menuId}" />
					<button data-act="inc" data-id="${c.menuId}">+</button>
				</div>
				<div>₹${formatMoney(c.price * c.qty)}</div>
				<button class="remove-btn" data-act="rm" data-id="${c.menuId}">Remove</button>
			</div>
		`).join("");
	}
	const { subtotal, tax, grand } = calcTotals();
	document.getElementById("subtotal").textContent = `₹${formatMoney(subtotal)}`;
	document.getElementById("grand-total").textContent = `₹${formatMoney(grand)}`;

	// Bind qty and remove
	list.querySelectorAll("button[data-act]").forEach((b) => {
		const id = b.getAttribute("data-id");
		const act = b.getAttribute("data-act");
		b.addEventListener("click", () => {
			if (act === "dec") {
				const item = cartItems.find((c) => c.menuId === id);
				if (!item) return;
				item.qty = Math.max(1, item.qty - 1);
				saveToStorage(STORAGE_KEYS.cart, cartItems);
				renderCart();
			} else if (act === "inc") {
				const item = cartItems.find((c) => c.menuId === id);
				if (!item) return;
				item.qty += 1;
				saveToStorage(STORAGE_KEYS.cart, cartItems);
				renderCart();
			} else if (act === "rm") {
				removeFromCart(id);
			}
		});
	});
	list.querySelectorAll('input[type="number"]').forEach((inp) => {
		inp.addEventListener("change", () => {
			updateQty(inp.getAttribute("data-id"), Number(inp.value));
		});
	});
}

// Pay Now (QR)
function onPayNow() {
	if (cartItems.length === 0) {
		alert("Cart is empty.");
		return;
	}
	const { grand } = calcTotals();
	const modal = document.getElementById("qr-modal");
	const qrDiv = document.getElementById("qr-code");
	qrDiv.innerHTML = "";

	// Always show a static QR image URL as requested
	const imgUrl = "qr/gpay qr.jpg";
	qrDiv.innerHTML = `<img src="${imgUrl}" alt="QR Code" width="256" height="256" />`;

	modal.classList.add("show");
	document.getElementById("close-qr").onclick = () => modal.classList.remove("show");
	document.getElementById("mark-paid").onclick = () => {
		recordSale();
		cartItems = [];
		saveToStorage(STORAGE_KEYS.cart, cartItems);
		renderCart();
		modal.classList.remove("show");
		alert("Payment recorded. Thank you!");
	};
}

// Prepare print area from a given order (used by invoice modal)
function populatePrintAreaFromOrder(order) {
	const itemsDiv = document.getElementById("bill-items");
	const totalsDiv = document.getElementById("bill-totals");
	const dateDiv = document.getElementById("bill-date");
	dateDiv.textContent = new Date(order.date).toLocaleString();
	itemsDiv.innerHTML = order.items.map((c) => `
		<div class="item-row"><span>${escapeHtml(c.name)} × ${c.qty}</span><span>₹${formatMoney(c.price * c.qty)}</span></div>
	`).join("");
	totalsDiv.innerHTML = `
		<div class="item-row"><span>Subtotal</span><span>₹${formatMoney(order.subtotal)}</span></div>
		<div class="item-row" style="font-weight:700;"><span>Total</span><span>₹${formatMoney(order.total)}</span></div>
	`;
}

// Record sale to storage
function recordSale() {
	const { subtotal, tax, grand } = calcTotals();
	const order = {
		id: cryptoRandomId(),
		date: new Date().toISOString(),
		items: cartItems.map((c) => ({ name: c.name, price: c.price, qty: c.qty })),
		subtotal,
		tax,
		total: grand
	};
	sales.push(order);
	saveToStorage(STORAGE_KEYS.sales, sales);
	// refresh invoices view if open
	if (document.getElementById("invoice-list")) {
		renderInvoicesList();
	}
}

// Manage Menu CRUD
function initManageView() {
	const form = document.getElementById("menu-form");
	const resetBtn = document.getElementById("reset-form");
	const manageSearch = document.getElementById("manage-search");

	form.addEventListener("submit", (e) => {
		e.preventDefault();
		const id = document.getElementById("item-id").value;
		const name = document.getElementById("item-name").value.trim();
		const price = Number(document.getElementById("item-price").value);
		const image = document.getElementById("item-image").value.trim();
		const category = document.getElementById("item-category").value.trim();
		if (!name || price <= 0 || !image) {
			alert("Please provide valid Name, Price and Image URL.");
			return;
		}
		if (id) {
			// update
			const idx = menuItems.findIndex((m) => m.id === id);
			if (idx >= 0) {
				menuItems[idx] = { ...menuItems[idx], name, price, image, category };
			}
		} else {
			menuItems.push({ id: cryptoRandomId(), name, price, image, category });
		}
		saveToStorage(STORAGE_KEYS.menu, menuItems);
		form.reset();
		document.getElementById("item-id").value = "";
		renderMenu();
		renderManageList();
	});
	resetBtn.addEventListener("click", () => {
		form.reset();
		document.getElementById("item-id").value = "";
	});
	manageSearch.addEventListener("input", renderManageList);
	renderManageList();
}
function renderManageList() {
	const list = document.getElementById("manage-list");
	const q = document.getElementById("manage-search").value.trim().toLowerCase();
	const filtered = menuItems.filter((m) => m.name.toLowerCase().includes(q) || (m.category || "").toLowerCase().includes(q));
	if (filtered.length === 0) {
		list.innerHTML = `<div style="color: var(--muted); padding: 8px;">No items.</div>`;
		return;
	}
	list.innerHTML = filtered.map((m) => `
		<div class="manage-item">
			<img src="${escapeHtml(m.image)}" alt="${escapeHtml(m.name)}" onerror="this.src='https://placehold.co/96x96?text=${encodeURIComponent(m.name)}'"/>
			<div>
				<div><strong>${escapeHtml(m.name)}</strong></div>
				<div style="color: var(--muted); font-size: 12px;">₹${formatMoney(m.price)} · ${escapeHtml(m.category || "")}</div>
			</div>
			<div class="manage-actions">
				<button class="edit-btn" data-id="${m.id}">Edit</button>
				<button class="del-btn" data-id="${m.id}">Delete</button>
			</div>
		</div>
	`).join("");
	list.querySelectorAll(".edit-btn").forEach((btn) => {
		btn.addEventListener("click", () => {
			const id = btn.getAttribute("data-id");
			const item = menuItems.find((x) => x.id === id);
			if (!item) return;
			document.getElementById("item-id").value = item.id;
			document.getElementById("item-name").value = item.name;
			document.getElementById("item-price").value = item.price;
			document.getElementById("item-image").value = item.image;
			document.getElementById("item-category").value = item.category || "";
			switchView("manage");
		});
	});
	list.querySelectorAll(".del-btn").forEach((btn) => {
		btn.addEventListener("click", () => {
			const id = btn.getAttribute("data-id");
			const item = menuItems.find((x) => x.id === id);
			if (!item) return;
			if (confirm(`Delete "${item.name}"?`)) {
				menuItems = menuItems.filter((m) => m.id !== id);
				saveToStorage(STORAGE_KEYS.menu, menuItems);
				renderMenu();
				renderManageList();
			}
		});
	});
}

// Reports
function initReportsView() {
	const monthInput = document.getElementById("report-month");
	const now = new Date();
	monthInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
	document.getElementById("load-report").addEventListener("click", renderReport);
	// Add Download CSV button
	const controls = document.querySelector(".report-controls");
	if (controls && !document.getElementById("download-report")) {
		const btn = document.createElement("button");
		btn.id = "download-report";
		btn.textContent = "Download CSV";
		btn.className = "secondary";
		btn.addEventListener("click", downloadMonthlyCsv);
		controls.appendChild(btn);
	}
	renderReport();
}
function renderReport() {
	const monthStr = document.getElementById("report-month").value; // yyyy-mm
	const summaryDiv = document.getElementById("report-summary");
	const tableDiv = document.getElementById("report-table");
	if (!monthStr) return;
	const [y, m] = monthStr.split("-").map(Number);
	const start = new Date(y, m - 1, 1);
	const end = new Date(y, m, 1);
	const monthSales = sales.filter((s) => {
		const d = new Date(s.date);
		return d >= start && d < end;
	});
	const totalRevenue = monthSales.reduce((sum, s) => sum + s.total, 0);
	const totalOrders = monthSales.length;
	const itemMap = new Map();
	monthSales.forEach((o) => {
		o.items.forEach((it) => {
			const key = it.name;
			const prev = itemMap.get(key) || { qty: 0, revenue: 0 };
			prev.qty += it.qty;
			prev.revenue += it.qty * it.price;
			itemMap.set(key, prev);
		});
	});
	const rows = Array.from(itemMap.entries())
		.sort((a, b) => b[1].revenue - a[1].revenue)
		.map(([name, data]) => `<tr><td>${escapeHtml(name)}</td><td>${data.qty}</td><td>₹${formatMoney(data.revenue)}</td></tr>`)
		.join("");

	summaryDiv.innerHTML = `
		<div><strong>Month:</strong> ${start.toLocaleString('default', { month: 'long' })} ${y}</div>
		<div><strong>Total Orders:</strong> ${totalOrders}</div>
		<div><strong>Total Revenue:</strong> ₹${formatMoney(totalRevenue)}</div>
	`;
	tableDiv.innerHTML = `
		<table>
			<thead><tr><th>Item</th><th>Qty</th><th>Revenue</th></tr></thead>
			<tbody>${rows || `<tr><td colspan="3" style="color: var(--muted);">No sales for this month.</td></tr>`}</tbody>
		</table>
	`;
}
function monthRangeFromInput() {
	const monthStr = document.getElementById("report-month").value;
	if (!monthStr) return null;
	const [y, m] = monthStr.split("-").map(Number);
	const start = new Date(y, m - 1, 1);
	const end = new Date(y, m, 1);
	return { start, end, y, m };
}
function downloadMonthlyCsv() {
	const range = monthRangeFromInput();
	if (!range) return;
	const { start, end, y, m } = range;
	const monthSales = sales.filter((s) => {
		const d = new Date(s.date);
		return d >= start && d < end;
	});
	if (monthSales.length === 0) {
		alert("No sales for this month.");
		return;
	}
	const rows = [["order_id","date","item","qty","price","line_total","order_total"]];
	monthSales.forEach((o) => {
		const orderTotal = o.total;
		o.items.forEach((it) => {
			const line = (it.qty * it.price);
			rows.push([o.id, new Date(o.date).toLocaleString(), it.name, it.qty, it.price, line, orderTotal]);
		});
	});
	const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
	const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = `sales_${y}-${String(m).padStart(2,"0")}.csv`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

// Invoices view and modal
function initInvoicesView() {
	renderInvoicesList();
	const modal = document.getElementById("invoice-modal");
	const closeBtn = document.getElementById("close-invoice");
	if (closeBtn) closeBtn.onclick = () => modal.classList.remove("show");
	const printBtn = document.getElementById("print-invoice");
	if (printBtn) printBtn.onclick = () => generateInvoicePdf();
}
function renderInvoicesList() {
	const container = document.getElementById("invoice-list");
	if (!container) return;
	if (sales.length === 0) {
		container.innerHTML = `<div style="color: var(--muted);">No invoices yet.</div>`;
		return;
	}
	const rows = sales.slice().sort((a,b) => new Date(b.date)-new Date(a.date)).map((o) => `
		<tr>
			<td>${escapeHtml(o.id)}</td>
			<td>${new Date(o.date).toLocaleString()}</td>
			<td>₹${formatMoney(o.total)}</td>
			<td class="actions"><button data-invoice="${o.id}">View Invoice</button></td>
		</tr>
	`).join("");
	container.innerHTML = `
		<table>
			<thead><tr><th>Order ID</th><th>Date</th><th>Total</th><th>Actions</th></tr></thead>
			<tbody>${rows}</tbody>
		</table>
	`;
	container.querySelectorAll("button[data-invoice]").forEach((btn) => {
		btn.addEventListener("click", () => {
			const id = btn.getAttribute("data-invoice");
			const order = sales.find(s => s.id === id);
			if (!order) return;
			showInvoice(order);
		});
	});
}
function showInvoice(order) {
	const content = document.getElementById("invoice-content");
	if (content) {
		content.innerHTML = `
			<div class="bill">
				<h2>Restaurant Invoice</h2>
				<div>${new Date(order.date).toLocaleString()}</div>
				<div style="margin-top:8px;">
					${order.items.map((c) => `<div class="item-row"><span>${escapeHtml(c.name)} × ${c.qty}</span><span>₹${formatMoney(c.price * c.qty)}</span></div>`).join("")}
				</div>
				<div style="margin-top:8px;">
					<div class="item-row"><span>Subtotal</span><span>₹${formatMoney(order.subtotal)}</span></div>
					<div class="item-row" style="font-weight:700;"><span>Total</span><span>₹${formatMoney(order.total)}</span></div>
				</div>
			</div>
		`;
	}
	// prepare hidden print area for clean print/export
	populatePrintAreaFromOrder(order);
	currentInvoiceOrder = order;
	const modal = document.getElementById("invoice-modal");
	modal.classList.add("show");
}

function generateInvoicePdf() {
	const billEl = document.querySelector("#invoice-content .bill") || document.querySelector("#print-area .bill");
	if (!billEl) return;
	const order = currentInvoiceOrder;
	const fileBase = order ? `invoice_${order.id}` : `invoice_${Date.now()}`;
	const opt = {
		margin:       10,
		filename:     `${fileBase}.pdf`,
		image:        { type: 'jpeg', quality: 0.98 },
		html2canvas:  { scale: 2, useCORS: true },
		jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
	};
	// html2pdf returns a promise; trigger save automatically
	// eslint-disable-next-line no-undef
	html2pdf().from(billEl).set(opt).save();
}

// Utils
function loadFromStorage(key, fallback) {
	try {
		const raw = localStorage.getItem(key);
		if (!raw) return fallback;
		return JSON.parse(raw);
	} catch {
		return fallback;
	}
}
function saveToStorage(key, value) {
	localStorage.setItem(key, JSON.stringify(value));
}
function formatMoney(n) {
	return Number(n).toFixed(2);
}
function escapeHtml(s) {
	return String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}
function cryptoRandomId() {
	if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
	return "id-" + Math.random().toString(36).slice(2) + Date.now();
}


