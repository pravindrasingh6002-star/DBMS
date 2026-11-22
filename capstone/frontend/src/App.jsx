import { useCallback, useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard, Package, ShoppingCart, Boxes, Users, ChartNoAxesCombined,
  Search, Bell, ChevronDown, Plus, ArrowUpRight, MoreHorizontal, Pencil, Trash2,
  X, Minus, Check, Menu, CircleAlert, IndianRupee, Truck
} from "lucide-react";
import { api } from "./api.js";

/* ------------------------------------------------------------------
   Helpers
------------------------------------------------------------------- */
const money = (value) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 0
}).format(value || 0);

const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "-";
const fmtDateTime = (d) => new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const navItems = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Products", icon: Package },
  { label: "Orders", icon: ShoppingCart },
  { label: "Inventory", icon: Boxes },
  { label: "Customers", icon: Users },
  { label: "Reports", icon: ChartNoAxesCombined }
];

const categoryEmoji = { Fashion: "👟", Home: "🏠", Accessories: "🎒", Electronics: "📦" };
const REASON_LABEL = { INITIAL: "Opening stock", RESTOCK: "Restock", ADJUSTMENT: "Adjustment", SALE: "Sale", ORDER_CANCELLED: "Order cancelled" };
const emptyProductForm = { name: "", category_id: "", price: "", stock: "" };
const emptyOrderForm = { customerId: "", newCustomer: false, name: "", email: "", payment: "UPI" };

function Status({ value }) {
  const key = value.toLowerCase();
  return <span className={`status status-${key.replaceAll(" ", "-")}`}><span />{value}</span>;
}

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="modal">
        <div className="modal-heading"><h2>{title}</h2><button className="icon-btn" onClick={onClose} aria-label="Close"><X size={19}/></button></div>
        {children}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------
   App
------------------------------------------------------------------- */
export default function App() {
  // ---- data that now comes from the DATABASE (through the API) ----
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [summary, setSummary] = useState(null);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // ---- UI state ----
  const [activePage, setActivePage] = useState("Overview");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All categories");
  const [orderFilter, setOrderFilter] = useState("All orders");
  const [mobileNav, setMobileNav] = useState(false);
  const [notice, setNotice] = useState(null); // { text, error }

  // ---- modals / forms ----
  const [showProductModal, setShowProductModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyProductForm);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderForm, setOrderForm] = useState(emptyOrderForm);
  const [cart, setCart] = useState({});
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const emptyCustomerForm = { name: "", email: "", phone: "", city: "" };
  const [customerForm, setCustomerForm] = useState(emptyCustomerForm);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [customerDetail, setCustomerDetail] = useState(null);
  const [orderDetail, setOrderDetail] = useState(null);

  /* ---------------- loading from the backend ---------------- */
  const refresh = useCallback(async () => {
    try {
      const [p, o, c, cat, s, m] = await Promise.all([
        api.getProducts(), api.getOrders(), api.getCustomers(),
        api.getCategories(), api.getSummary(), api.getMovements()
      ]);
      setProducts(p); setOrders(o); setCustomers(c); setCategories(cat); setSummary(s); setMovements(m);
      setLoadError("");
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  function flash(text, error = false) {
    setNotice({ text, error });
    window.setTimeout(() => setNotice(null), 3200);
  }

  // Run a backend action, reload the data, and show a success / error message.
  async function run(action, okMessage) {
    try {
      const result = await action();
      await refresh();
      if (okMessage) flash(typeof okMessage === "function" ? okMessage(result) : okMessage);
      return true;
    } catch (err) {
      await refresh();
      flash(err.message, true);
      return false;
    }
  }

  /* ---------------- derived values ---------------- */
  const filteredProducts = useMemo(() => products.filter((p) => {
    const matchSearch = `${p.name} PRD-${p.id} ${p.category}`.toLowerCase().includes(search.toLowerCase());
    return matchSearch && (category === "All categories" || p.category === category);
  }), [products, search, category]);

  const filteredOrders = useMemo(() => orders.filter((o) => {
    const matchSearch = `ORD-${o.id} ${o.customer}`.toLowerCase().includes(search.toLowerCase());
    return matchSearch && (orderFilter === "All orders" || o.status === orderFilter);
  }), [orders, search, orderFilter]);

  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 10);
  const outOfStock = products.filter((p) => p.stock === 0);
  const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotal = products.reduce((sum, p) => sum + p.price * (cart[p.id] || 0), 0);
  const revenue = orders.filter((o) => o.status !== "Cancelled").reduce((sum, o) => sum + o.total, 0);
  const toFulfil = orders.filter((o) => ["Pending", "Processing"].includes(o.status)).length;

  /* ---------------- actions ---------------- */
  function openAddProduct() {
    setEditing(null);
    setForm({ ...emptyProductForm, category_id: categories[0]?.id ?? "" });
    setShowProductModal(true);
  }

  function openEditProduct(p) {
    setEditing(p);
    setForm({ name: p.name, category_id: p.category_id, price: p.price, stock: "" });
    setShowProductModal(true);
  }

  async function saveProduct(e) {
    e.preventDefault();
    const catName = categories.find((c) => c.id === Number(form.category_id))?.name;
    const payload = { name: form.name.trim(), category_id: Number(form.category_id), price: Number(form.price) };
    const ok = editing
      ? await run(() => api.updateProduct(editing.id, payload), "Product updated.")
      : await run(() => api.addProduct({ ...payload, stock: Number(form.stock), emoji: categoryEmoji[catName] || "📦" }), "Product added to the catalogue.");
    if (ok) {
      setShowProductModal(false);
      if (!editing) { setActivePage("Products"); setSearch(""); }
    }
  }

  async function deleteProduct(p) {
    if (!window.confirm(`Remove "${p.name}"?`)) return;
    await run(() => api.deleteProduct(p.id), (r) =>
      r.deleted === "soft" ? "Product has past orders, so it was hidden instead of erased." : "Product deleted.");
  }

  const updateStock = (id, amount) => run(() => api.changeStock(id, amount), "Inventory quantity updated.");

  function openOrderModal() {
    setCart({});
    setOrderForm({ ...emptyOrderForm, customerId: customers[0]?.id ?? "", newCustomer: customers.length === 0 });
    setShowOrderModal(true);
  }

  function addToCart(product) {
    if (product.stock < (cart[product.id] || 0) + 1) return flash("Not enough stock available.", true);
    setCart((prev) => ({ ...prev, [product.id]: (prev[product.id] || 0) + 1 }));
  }

  function changeCart(id, amount) {
    setCart((prev) => {
      const next = { ...prev, [id]: Math.max(0, (prev[id] || 0) + amount) };
      if (!next[id]) delete next[id];
      return next;
    });
  }

  async function placeOrder(e) {
    e.preventDefault();
    if (!cartCount) return flash("Add at least one item to the cart.", true);
    if (orderForm.newCustomer && (!orderForm.name.trim() || !orderForm.email.trim())) return flash("Enter the new customer's name and email.", true);
    if (!orderForm.newCustomer && !orderForm.customerId) return flash("Choose a customer.", true);

    const ok = await run(async () => {
      let customerId = Number(orderForm.customerId);
      if (orderForm.newCustomer) {
        const c = await api.addCustomer({ name: orderForm.name, email: orderForm.email });
        customerId = c.id;
      }
      return api.createOrder({
        customer_id: customerId,
        payment_method: orderForm.payment,
        items: Object.entries(cart).map(([id, quantity]) => ({ product_id: Number(id), quantity }))
      });
    }, (o) => `Order ORD-${o.id} placed successfully.`);
    if (ok) { setCart({}); setShowOrderModal(false); setActivePage("Orders"); }
  }

  const updateOrderStatus = (id, status) => run(() => api.setOrderStatus(id, status), `Order ORD-${id} marked ${status.toLowerCase()}.`);

  function openAddCustomer() {
    setEditingCustomer(null);
    setCustomerForm(emptyCustomerForm);
    setShowCustomerModal(true);
  }

  function openEditCustomer(c) {
    setEditingCustomer(c);
    setCustomerForm({ name: c.name, email: c.email, phone: c.phone || "", city: c.city || "" });
    setShowCustomerModal(true);
  }

  async function saveCustomer(e) {
    e.preventDefault();
    const ok = editingCustomer
      ? await run(() => api.updateCustomer(editingCustomer.id, customerForm), "Customer updated.")
      : await run(() => api.addCustomer(customerForm), "Customer added.");
    if (ok) {
      setShowCustomerModal(false);
      if (editingCustomer && customerDetail) viewCustomer(editingCustomer.id); // refresh the open details
    }
  }

  async function viewCustomer(id) {
    try { setCustomerDetail(await api.getCustomer(id)); } catch (err) { flash(err.message, true); }
  }

  async function viewOrder(id) {
    try { setOrderDetail(await api.getOrder(id)); } catch (err) { flash(err.message, true); }
  }

  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).toUpperCase();
  const pageTitle = activePage === "Overview" ? "Dashboard overview" : activePage;
  const pageDescription = {
    Overview: "Here’s what’s happening with your store today.",
    Products: "Manage your product catalogue and pricing.",
    Orders: "Track, process, and manage customer orders.",
    Inventory: "Monitor stock levels and replenish products.",
    Customers: "Everyone who has shopped with your store.",
    Reports: "Live figures calculated by SQL queries on your database."
  }[activePage];

  /* ---------------- render ---------------- */
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <div className="brand"><div className="brand-mark"><Boxes size={22}/></div><span>stockly<span className="brand-dot">.</span><small>COMMERCE ADMIN</small></span><button className="mobile-close icon-btn" onClick={() => setMobileNav(false)}><X/></button></div>
        <div className="store-switch"><div className="store-avatar">S</div><div><strong>Singh's Store</strong><span>Online store</span></div><ChevronDown size={16}/></div>
        <div className="nav-caption">WORKSPACE</div>
        <nav className="nav-list">
          {navItems.map(({ label, icon: Icon }) => (
            <button key={label} className={`nav-item ${activePage === label ? "active" : ""}`} onClick={() => { setActivePage(label); setSearch(""); setMobileNav(false); }}>
              <Icon size={18}/><span>{label}</span>
              {label === "Inventory" && (lowStock.length + outOfStock.length > 0) && <span className="nav-count">{lowStock.length + outOfStock.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card"><div className="help-icon">✦</div><strong>Need a hand?</strong><p>Explore your store management tools.</p><button onClick={() => flash("Tip: use Products and Inventory to manage stock.")}>View quick tips <ArrowUpRight size={14}/></button></div>
          <div className="profile"><div className="profile-avatar">PS</div><div className="profile-info"><strong>Store Admin</strong><span>Administrator</span></div><MoreHorizontal size={19}/></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu icon-btn" onClick={() => setMobileNav(true)} aria-label="Open menu"><Menu/></button>
          <div className="breadcrumbs">Workspace <span>/</span> <strong>{activePage}</strong></div>
          <div className="topbar-actions">
            <label className="global-search"><Search size={17}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products, orders..." /><kbd>⌘ K</kbd></label>
            <button className="icon-btn notification-btn" onClick={() => flash(`${lowStock.length + outOfStock.length} products need stock attention.`)} aria-label="Notifications"><Bell size={19}/><i/></button>
            <div className="top-user"><div className="profile-avatar">PS</div><ChevronDown size={15}/></div>
          </div>
        </header>

        <div className="page-content">
          <div className="page-heading">
            <div><div className="eyebrow">{today}</div><h1>{pageTitle}</h1><p>{pageDescription}</p></div>
            <div className="heading-actions">
              <button className="btn btn-secondary" onClick={openOrderModal} disabled={loading || !!loadError}><ShoppingCart size={16}/> Create order</button>
              <button className="btn btn-primary" onClick={openAddProduct} disabled={loading || !!loadError}><Plus size={17}/> Add product</button>
            </div>
          </div>

          {loadError && <div className="error-banner"><CircleAlert size={18}/><div><strong>Could not load data.</strong><span>{loadError}</span></div><button className="btn btn-secondary btn-small" onClick={() => { setLoading(true); refresh(); }}>Retry</button></div>}
          {loading && !loadError && <div className="panel empty-state">Loading data from the database…</div>}

          {!loading && !loadError && <>
          {activePage === "Overview" && <>
            <div className="stats-grid">
              <StatCard title="Total revenue" value={money(revenue)} change="Excl. cancelled orders" icon={IndianRupee} tone="purple" note="from the database" up/>
              <StatCard title="Total orders" value={orders.length.toString()} change={`${toFulfil} to fulfil`} icon={ShoppingCart} tone="blue" note="pending or processing" up/>
              <StatCard title="Products in stock" value={totalStock.toLocaleString("en-IN")} change={`${products.length} products`} icon={Package} tone="green" note="across all categories"/>
              <StatCard title="Low stock alerts" value={(lowStock.length + outOfStock.length).toString()} change={outOfStock.length ? `${outOfStock.length} out of stock` : "All stocked"} icon={CircleAlert} tone="orange" note="needs your attention" warning/>
            </div>
            <div className="dashboard-grid">
              <section className="panel recent-orders">
                <div className="panel-header"><div><h2>Recent orders</h2><p>Keep track of your latest sales</p></div><button className="text-link" onClick={() => setActivePage("Orders")}>View all <ArrowUpRight size={15}/></button></div>
                <OrdersTable orders={orders.slice(0, 5)} onStatus={updateOrderStatus} onView={viewOrder} compact/>
              </section>
              <section className="panel inventory-panel">
                <div className="panel-header"><div><h2>Inventory overview</h2><p>Products that need attention</p></div><button className="icon-btn" onClick={() => setActivePage("Inventory")}><ArrowUpRight size={17}/></button></div>
                {products.filter((p) => p.stock <= 10).length === 0 ? <div className="empty-state">All products are well stocked.</div> :
                  products.filter((p) => p.stock <= 10).slice(0, 5).map((p) => (
                    <div className="stock-row" key={p.id}><ProductThumb product={p}/><div className="stock-info"><strong>{p.name}</strong><span>PRD-{p.id}</span><div className="stock-bar"><i style={{ width: `${Math.min(p.stock / 15 * 100, 100)}%` }}/></div></div><div className={`stock-number ${p.stock === 0 ? "danger" : "warning"}`}>{p.stock}<small>left</small></div></div>
                  ))}
                <button className="full-width-link" onClick={() => setActivePage("Inventory")}>Manage inventory <ArrowUpRight size={15}/></button>
              </section>
            </div>
            <section className="panel products-panel">
              <div className="panel-header"><div><h2>Best-selling products</h2><p>Your top products by units sold</p></div><button className="text-link" onClick={() => setActivePage("Products")}>All products <ArrowUpRight size={15}/></button></div>
              <div className="best-sellers">{[...products].sort((a, b) => b.sold - a.sold).slice(0, 4).map((p, i) => (
                <div className="best-card" key={p.id}><div className={`best-art ${p.color}`}>{p.emoji}</div><div className="best-meta"><span>#{i + 1} BESTSELLER</span><strong>{p.name}</strong><small>{p.sold} units sold</small></div><strong className="best-price">{money(p.price)}</strong></div>
              ))}</div>
            </section>
          </>}

          {activePage === "Products" && <section className="panel table-panel">
            <div className="panel-header"><div><h2>Product catalogue</h2><p>{filteredProducts.length} products shown</p></div><div className="table-tools">
              <select value={category} onChange={(e) => setCategory(e.target.value)}><option>All categories</option>{categories.map((c) => <option key={c.id}>{c.name}</option>)}</select>
              <button className="btn btn-primary btn-small" onClick={openAddProduct}><Plus size={15}/> Add product</button></div></div>
            <ProductsTable products={filteredProducts} onDelete={deleteProduct} onEdit={openEditProduct} onStock={updateStock}/>
          </section>}

          {activePage === "Inventory" && <>
            <section className="panel table-panel">
              <div className="panel-header"><div><h2>Stock management</h2><p>Update quantities and watch stock alerts.</p></div><div className="inventory-summary"><span><i className="dot-green"/> In stock: {products.filter(p => p.stock > 10).length}</span><span><i className="dot-orange"/> Low: {lowStock.length}</span><span><i className="dot-red"/> Out: {outOfStock.length}</span></div></div>
              <InventoryTable products={products} onStock={updateStock}/>
            </section>
            <section className="panel table-panel extra-panel">
              <div className="panel-header"><div><h2>Recent stock movements</h2><p>Every change to stock is logged in the database.</p></div></div>
              <div className="table-scroll"><table><thead><tr><th>WHEN</th><th>PRODUCT</th><th>CHANGE</th><th>REASON</th><th>ORDER</th></tr></thead><tbody>
                {movements.map((m) => <tr key={m.id}><td className="muted-cell">{fmtDateTime(m.created_at)}</td><td><strong>{m.product}</strong></td><td><span className={`move ${m.change_qty > 0 ? "plus" : "minus"}`}>{m.change_qty > 0 ? "+" : ""}{m.change_qty}</span></td><td>{REASON_LABEL[m.reason] || m.reason}</td><td className="muted-cell">{m.order_id ? `ORD-${m.order_id}` : "-"}</td></tr>)}
              </tbody></table></div>
            </section>
          </>}

          {activePage === "Orders" && <section className="panel table-panel">
            <div className="panel-header"><div><h2>All orders</h2><p>Review orders and update fulfilment status.</p></div><div className="table-tools">
              <select value={orderFilter} onChange={(e) => setOrderFilter(e.target.value)}><option>All orders</option><option>Pending</option><option>Processing</option><option>Shipped</option><option>Delivered</option><option>Cancelled</option></select>
              <button className="btn btn-primary btn-small" onClick={openOrderModal}><Plus size={15}/> Create order</button></div></div>
            <OrdersTable orders={filteredOrders} onStatus={updateOrderStatus} onView={viewOrder}/>
          </section>}

          {activePage === "Customers" && <section className="panel table-panel">
            <div className="panel-header"><div><h2>Customers</h2><p>{customers.length} customers in the database.</p></div>
              <button className="btn btn-primary btn-small" onClick={openAddCustomer}><Plus size={15}/> Add customer</button></div>
            <CustomersTable onView={viewCustomer} customers={customers.filter((c) => `${c.name} ${c.email} ${c.phone || ""} ${c.city || ""}`.toLowerCase().includes(search.toLowerCase()))}/>
          </section>}

          {activePage === "Reports" && summary && <div className="reports-grid">
            <section className="panel report-card"><div className="report-icon purple"><IndianRupee/></div><span>Gross sales</span><h2>{money(summary.revenue)}</h2><p>SUM of total_amount, excluding cancelled orders.</p></section>
            <section className="panel report-card"><div className="report-icon blue"><ShoppingCart/></div><span>Average order value</span><h2>{money(summary.avgOrderValue)}</h2><p>AVG of total_amount over {summary.activeOrders} active orders.</p></section>
            <section className="panel report-card"><div className="report-icon green"><Package/></div><span>Units in inventory</span><h2>{summary.unitsInStock}</h2><p>SUM of stock_qty across active products.</p></section>
            <section className="panel report-card"><div className="report-icon orange"><Truck/></div><span>Orders to fulfil</span><h2>{summary.ordersToFulfil}</h2><p>COUNT of pending or processing orders.</p></section>
            <section className="panel report-list">
              <h2>Revenue by category</h2><p>From the <code>v_revenue_by_category</code> view (JOIN + GROUP BY).</p>
              <table><thead><tr><th>CATEGORY</th><th>UNITS SOLD</th><th>REVENUE</th></tr></thead><tbody>{summary.byCategory.map((r) => <tr key={r.category}><td><strong>{r.category}</strong></td><td>{r.units_sold}</td><td className="price-cell">{money(r.revenue)}</td></tr>)}</tbody></table>
            </section>
            <section className="panel report-list">
              <h2>Top customers</h2><p>Highest spenders, cancelled orders excluded.</p>
              {summary.topCustomers.length === 0 ? <div className="empty-state">No sales yet.</div> :
                <table><thead><tr><th>CUSTOMER</th><th>ORDERS</th><th>SPENT</th></tr></thead><tbody>{summary.topCustomers.map((r) => <tr key={r.name}><td><strong>{r.name}</strong></td><td>{r.orders}</td><td className="price-cell">{money(r.spent)}</td></tr>)}</tbody></table>}
            </section>
          </div>}
          </>}

          <footer className="footer"><span>© 2026 Stockly Admin · DBMS Capstone Project</span><span><i className="live-dot"/> {loadError ? "Backend offline" : "Connected to MySQL"}</span></footer>
        </div>
      </main>

      {showProductModal && <Modal title={editing ? `Edit PRD-${editing.id}` : "Add new product"} onClose={() => setShowProductModal(false)}>
        <form className="modal-form" onSubmit={saveProduct}>
          <label>Product name<input required minLength="2" placeholder="e.g. Bluetooth Keyboard" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}/></label>
          <label>Category<select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <div className="form-row">
            <label>Price (₹)<input required min="1" type="number" placeholder="999" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}/></label>
            {!editing && <label>Opening stock<input required min="0" type="number" placeholder="20" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })}/></label>}
          </div>
          <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setShowProductModal(false)}>Cancel</button><button className="btn btn-primary" type="submit"><Check size={16}/> {editing ? "Save changes" : "Save product"}</button></div>
          {editing && <p className="form-footnote">Stock is changed from the Inventory page so every change is logged.</p>}
        </form>
      </Modal>}

      {showOrderModal && <Modal title="Create order" onClose={() => setShowOrderModal(false)}>
        <form className="modal-form" onSubmit={placeOrder}>
          {orderForm.newCustomer ? (
            <div className="form-row">
              <label>New customer name<input required value={orderForm.name} onChange={(e) => setOrderForm({ ...orderForm, name: e.target.value })} placeholder="Full name"/></label>
              <label>Email<input required type="email" value={orderForm.email} onChange={(e) => setOrderForm({ ...orderForm, email: e.target.value })} placeholder="name@example.com"/></label>
            </div>
          ) : (
            <label>Customer<select value={orderForm.customerId} onChange={(e) => setOrderForm({ ...orderForm, customerId: e.target.value })}>{customers.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.email}</option>)}</select></label>
          )}
          {customers.length > 0 && <button type="button" className="text-link" onClick={() => setOrderForm({ ...orderForm, newCustomer: !orderForm.newCustomer })}>{orderForm.newCustomer ? "← Pick an existing customer" : "+ New customer"}</button>}
          <label>Payment method<select value={orderForm.payment} onChange={(e) => setOrderForm({ ...orderForm, payment: e.target.value })}><option>UPI</option><option>Card</option><option>COD</option></select></label>
          <div className="cart-product-list">{products.filter((p) => p.stock > 0).map((p) => (
            <div className="cart-product" key={p.id}><ProductThumb product={p}/><div className="cart-product-info"><strong>{p.name}</strong><span>{money(p.price)} · {p.stock} available</span></div>
              <button type="button" className="quantity-btn" disabled={!cart[p.id]} onClick={() => changeCart(p.id, -1)}><Minus size={13}/></button>
              <b className="quantity">{cart[p.id] || 0}</b>
              <button type="button" className="quantity-btn" disabled={(cart[p.id] || 0) >= p.stock} onClick={() => addToCart(p)}><Plus size={13}/></button></div>
          ))}</div>
          <div className="cart-total"><span>{cartCount} items</span><strong>{money(cartTotal)}</strong></div>
          <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setShowOrderModal(false)}>Cancel</button><button className="btn btn-primary" type="submit"><Check size={16}/> Place order</button></div>
          <p className="form-footnote">The server re-checks stock and saves the order and stock change in one database transaction.</p>
        </form>
      </Modal>}

      {showCustomerModal && <Modal title={editingCustomer ? `Edit ${editingCustomer.name}` : "Add customer"} onClose={() => setShowCustomerModal(false)}>
        <form className="modal-form" onSubmit={saveCustomer}>
          <label>Full name<input required minLength="2" value={customerForm.name} onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}/></label>
          <label>Email<input required type="email" value={customerForm.email} onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}/></label>
          <div className="form-row">
            <label>Mobile number<input type="tel" inputMode="numeric" maxLength="10" pattern="[6-9][0-9]{9}" title="10 digits, starting with 6, 7, 8 or 9" placeholder="9876543210" value={customerForm.phone} onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value.replace(/\D/g, "") })}/></label>
            <label>City<input value={customerForm.city} onChange={(e) => setCustomerForm({ ...customerForm, city: e.target.value })}/></label>
          </div>
          <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={() => setShowCustomerModal(false)}>Cancel</button><button className="btn btn-primary" type="submit"><Check size={16}/> {editingCustomer ? "Save changes" : "Save customer"}</button></div>
        </form>
      </Modal>}

      {customerDetail && <Modal title={customerDetail.name} onClose={() => setCustomerDetail(null)}>
        <div className="order-detail">
          <div className="order-meta"><div><span>Customer ID</span><strong>{customerDetail.id}</strong></div><div><span>Email</span><strong>{customerDetail.email}</strong></div><div><span>Mobile</span><strong>{customerDetail.phone || "-"}</strong></div><div><span>City</span><strong>{customerDetail.city || "-"}</strong></div></div>
          <div className="order-meta"><div><span>Customer since</span><strong>{fmtDate(customerDetail.created_at)}</strong></div><div><span>Orders</span><strong>{customerDetail.orders}</strong></div><div><span>Total spent</span><strong>{money(customerDetail.total_spent)}</strong></div><div><span>Last order</span><strong>{fmtDate(customerDetail.last_order)}</strong></div></div>
          {customerDetail.order_list.length === 0 ? <div className="empty-state">This customer has not placed any orders yet.</div> :
            <div className="table-scroll"><table><thead><tr><th>ORDER</th><th>DATE</th><th>ITEMS</th><th>TOTAL</th><th>STATUS</th></tr></thead><tbody>
              {customerDetail.order_list.map((o) => <tr key={o.id}><td><button className="link-btn order-id" onClick={() => viewOrder(o.id)}>ORD-{o.id}</button></td><td className="muted-cell">{fmtDate(o.date)}</td><td>{o.items}</td><td className="price-cell">{money(o.total)}</td><td><Status value={o.status}/></td></tr>)}
            </tbody></table></div>}
          <div className="modal-actions"><button className="btn btn-secondary" onClick={() => setCustomerDetail(null)}>Close</button><button className="btn btn-primary" onClick={() => openEditCustomer(customerDetail)}><Pencil size={15}/> Edit customer</button></div>
        </div>
      </Modal>}

      {orderDetail && <Modal title={`Order ORD-${orderDetail.id}`} onClose={() => setOrderDetail(null)}>
        <div className="order-detail">
          <div className="order-meta"><div><span>Customer</span><strong>{orderDetail.customer}</strong></div><div><span>Date</span><strong>{fmtDate(orderDetail.date)}</strong></div><div><span>Payment</span><strong>{orderDetail.method}</strong></div><div><span>Status</span><Status value={orderDetail.status}/></div></div>
          <div className="table-scroll"><table><thead><tr><th>ITEM</th><th>QTY</th><th>PRICE</th><th>TOTAL</th></tr></thead><tbody>
            {orderDetail.lines.map((l) => <tr key={l.product_id}><td><strong>{l.emoji} {l.name}</strong></td><td>{l.quantity}</td><td>{money(l.unit_price)}</td><td className="price-cell">{money(l.line_total)}</td></tr>)}
          </tbody></table></div>
          <div className="cart-total"><span>Order total</span><strong>{money(orderDetail.total)}</strong></div>
        </div>
      </Modal>}

      {notice && <div className={`toast ${notice.error ? "error" : ""}`}><span>{notice.error ? <X size={16}/> : <Check size={16}/>}</span>{notice.text}<button className="icon-btn" onClick={() => setNotice(null)}><X size={15}/></button></div>}
    </div>
  );
}

/* ------------------------------------------------------------------
   Small presentational components
------------------------------------------------------------------- */
function StatCard({ title, value, change, icon: Icon, tone, note, up, warning }) {
  return <section className="panel stat-card"><div className="stat-top"><span>{title}</span><div className={`stat-icon ${tone}`}><Icon size={19}/></div></div><div className="stat-value">{value}</div><div className="stat-bottom"><span className={warning ? "change warning-text" : "change"}>{up ? <ArrowUpRight size={14}/> : warning ? <CircleAlert size={14}/> : null}{change}</span><span>{note}</span></div></section>;
}

function ProductThumb({ product }) {
  return <div className={`product-thumb ${product.color || "lavender"}`}>{product.emoji || "📦"}</div>;
}

const stockClass = (s) => s === 0 ? "out" : s <= 10 ? "low" : "good";

function ProductsTable({ products, onDelete, onEdit, onStock }) {
  if (!products.length) return <div className="empty-state">No products match your search.</div>;
  return <div className="table-scroll"><table><thead><tr><th>PRODUCT</th><th>PRODUCT ID</th><th>CATEGORY</th><th>PRICE</th><th>STOCK</th><th>UNITS SOLD</th><th>ACTIONS</th></tr></thead><tbody>
    {products.map((p) => <tr key={p.id}>
      <td><div className="product-cell"><ProductThumb product={p}/><strong>{p.name}</strong></div></td>
      <td className="muted-cell">PRD-{p.id}</td>
      <td><span className="category-pill">{p.category}</span></td>
      <td className="price-cell">{money(p.price)}</td>
      <td><span className={`stock-pill ${stockClass(p.stock)}`}>{p.stock === 0 ? "Out of stock" : p.stock <= 10 ? "Low stock" : `${p.stock} units`}</span></td>
      <td>{p.sold}</td>
      <td><div className="action-buttons">
        <button className="icon-btn" title="Add one unit" onClick={() => onStock(p.id, 1)}><Plus size={15}/></button>
        <button className="icon-btn" title="Edit product" onClick={() => onEdit(p)}><Pencil size={15}/></button>
        <button className="icon-btn danger-hover" title="Remove product" onClick={() => onDelete(p)}><Trash2 size={15}/></button>
      </div></td></tr>)}
  </tbody></table></div>;
}

function InventoryTable({ products, onStock }) {
  return <div className="table-scroll"><table><thead><tr><th>PRODUCT</th><th>PRODUCT ID</th><th>STOCK STATUS</th><th>QUANTITY</th><th>UPDATE STOCK</th></tr></thead><tbody>
    {products.map((p) => <tr key={p.id}>
      <td><div className="product-cell"><ProductThumb product={p}/><strong>{p.name}</strong></div></td>
      <td className="muted-cell">PRD-{p.id}</td>
      <td><span className={`stock-pill ${stockClass(p.stock)}`}>{p.stock === 0 ? "Out of stock" : p.stock <= 10 ? "Low stock" : "In stock"}</span></td>
      <td><strong>{p.stock}</strong> <span className="muted-cell">units</span></td>
      <td><div className="inventory-controls">
        <button className="quantity-btn" disabled={p.stock === 0} onClick={() => onStock(p.id, -1)}><Minus size={14}/></button>
        <button className="quantity-btn" onClick={() => onStock(p.id, 1)}><Plus size={14}/></button>
        <button className="reorder-btn" onClick={() => onStock(p.id, 10)}>+10 restock</button>
      </div></td></tr>)}
  </tbody></table></div>;
}

function OrdersTable({ orders, onStatus, onView, compact = false }) {
  if (!orders.length) return <div className="empty-state">No orders match your search.</div>;
  return <div className="table-scroll"><table><thead><tr><th>ORDER ID</th><th>CUSTOMER</th><th>DATE</th><th>ITEMS</th><th>TOTAL</th><th>STATUS</th>{!compact && <th>PAYMENT</th>}<th>ACTION</th></tr></thead><tbody>
    {orders.map((o) => <tr key={o.id}>
      <td><button className="link-btn order-id" onClick={() => onView(o.id)} title="View order details">ORD-{o.id}</button></td>
      <td>{o.customer}</td>
      <td className="muted-cell">{fmtDate(o.date)}</td>
      <td>{o.items}</td>
      <td className="price-cell">{money(o.total)}</td>
      <td><Status value={o.status}/></td>
      {!compact && <td><span className="payment-method">{o.method}</span></td>}
      <td><select className="status-select" aria-label={`Update ORD-${o.id} status`} value={o.status} disabled={o.status === "Cancelled"} onChange={(e) => onStatus(o.id, e.target.value)}>
        {["Pending", "Processing", "Shipped", "Delivered", "Cancelled"].map((s) => <option key={s} disabled={s === "Cancelled" && o.status === "Delivered"}>{s}</option>)}
      </select></td></tr>)}
  </tbody></table></div>;
}

function CustomersTable({ customers, onView }) {
  if (!customers.length) return <div className="empty-state">No customers found.</div>;
  return <div className="table-scroll"><table><thead><tr><th>CUSTOMER</th><th>EMAIL</th><th>MOBILE</th><th>CITY</th><th>ORDERS</th><th>TOTAL SPENT</th><th>LAST ORDER</th></tr></thead><tbody>
    {customers.map((c) => <tr key={c.id}>
      <td><div className="customer-cell"><div className="customer-avatar">{c.name.split(" ").map((s) => s[0]).join("").slice(0, 2)}</div><button className="link-btn" onClick={() => onView(c.id)} title="View customer details"><strong>{c.name}</strong></button></div></td>
      <td className="muted-cell">{c.email}</td>
      <td className="muted-cell">{c.phone || "-"}</td>
      <td className="muted-cell">{c.city || "-"}</td>
      <td>{c.orders}</td>
      <td className="price-cell">{money(c.total_spent)}</td>
      <td className="muted-cell">{fmtDate(c.last_order)}</td></tr>)}
  </tbody></table></div>;
}