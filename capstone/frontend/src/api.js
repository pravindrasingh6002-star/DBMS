// ---------------------------------------------------------------
//  api.js - the ONLY place where the frontend talks to the backend.
//  Every function returns parsed JSON, or throws an Error whose
//  message comes from the server (so we can show it in a toast).
// ---------------------------------------------------------------
async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new Error("Cannot reach the server. Is the backend running?");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Request failed.");
  return data;
}

export const api = {
  // products
  getCategories: () => request("/products/categories"),
  getProducts: () => request("/products"),
  addProduct: (body) => request("/products", { method: "POST", body }),
  updateProduct: (id, body) => request(`/products/${id}`, { method: "PUT", body }),
  changeStock: (id, change) => request(`/products/${id}/stock`, { method: "PATCH", body: { change } }),
  deleteProduct: (id) => request(`/products/${id}`, { method: "DELETE" }),
  // customers
  getCustomers: () => request("/customers"),
  getCustomer: (id) => request(`/customers/${id}`),
  addCustomer: (body) => request("/customers", { method: "POST", body }),
  updateCustomer: (id, body) => request(`/customers/${id}`, { method: "PUT", body }),
  // orders
  getOrders: () => request("/orders"),
  getOrder: (id) => request(`/orders/${id}`),
  createOrder: (body) => request("/orders", { method: "POST", body }),
  setOrderStatus: (id, status) => request(`/orders/${id}/status`, { method: "PATCH", body: { status } }),
  // reports
  getSummary: () => request("/reports/summary"),
  getMovements: () => request("/reports/stock-movements"),
};