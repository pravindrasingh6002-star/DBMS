SET NAMES utf8mb4;
-- ============================================================
--  Stockly: E-commerce Order & Inventory Management System
--  Schema (MySQL 8 / MariaDB 10.5+)
--  Run:  mysql -u root -p < database/schema.sql
-- ============================================================

DROP DATABASE IF EXISTS stockly;
CREATE DATABASE stockly CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE stockly;

-- 1. CATEGORIES -------------------------------------------------
CREATE TABLE categories (
  category_id  INT AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- 2. PRODUCTS ---------------------------------------------------
-- AUTO_INCREMENT starts at 1001 so the frontend can show "PRD-1001".
CREATE TABLE products (
  product_id   INT AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(120) NOT NULL,
  category_id  INT NOT NULL,
  price        DECIMAL(10,2) NOT NULL,
  stock_qty    INT NOT NULL DEFAULT 0,
  emoji        VARCHAR(8)  NOT NULL DEFAULT '📦',
  color        VARCHAR(20) NOT NULL DEFAULT 'lavender',
  is_active    TINYINT(1)  NOT NULL DEFAULT 1,      -- soft-delete flag
  created_at   TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_price CHECK (price > 0),
  CONSTRAINT chk_stock CHECK (stock_qty >= 0),      -- stock can never go negative
  CONSTRAINT fk_product_category FOREIGN KEY (category_id)
    REFERENCES categories(category_id) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=1001;

CREATE INDEX idx_products_category ON products(category_id);

-- 3. CUSTOMERS --------------------------------------------------
CREATE TABLE customers (
  customer_id  INT AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  email        VARCHAR(120) NOT NULL UNIQUE,
  phone        VARCHAR(20),
  city         VARCHAR(60),
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- Indian mobile number: 10 digits, first digit 6-9 (the database itself enforces this)
  CONSTRAINT chk_phone CHECK (phone IS NULL OR phone REGEXP '^[6-9][0-9]{9}$')
) ENGINE=InnoDB AUTO_INCREMENT=5001;

-- 4. ORDERS -----------------------------------------------------
-- AUTO_INCREMENT starts at 2001 so the frontend can show "ORD-2001".
CREATE TABLE orders (
  order_id        INT AUTO_INCREMENT PRIMARY KEY,
  customer_id     INT NOT NULL,
  order_date      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status          ENUM('Pending','Processing','Shipped','Delivered','Cancelled') NOT NULL DEFAULT 'Pending',
  payment_method  ENUM('UPI','Card','COD') NOT NULL DEFAULT 'UPI',
  total_amount    DECIMAL(12,2) NOT NULL DEFAULT 0,
  CONSTRAINT fk_order_customer FOREIGN KEY (customer_id)
    REFERENCES customers(customer_id) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=2001;

CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status   ON orders(status);

-- 5. ORDER_ITEMS ------------------------------------------------
-- Resolves the many-to-many relationship between orders and products.
-- unit_price is COPIED from products at order time, so later price
-- changes never rewrite history.
CREATE TABLE order_items (
  order_item_id  INT AUTO_INCREMENT PRIMARY KEY,
  order_id       INT NOT NULL,
  product_id     INT NOT NULL,
  quantity       INT NOT NULL,
  unit_price     DECIMAL(10,2) NOT NULL,
  CONSTRAINT chk_qty CHECK (quantity > 0),
  CONSTRAINT uq_order_product UNIQUE (order_id, product_id),
  CONSTRAINT fk_item_order   FOREIGN KEY (order_id)   REFERENCES orders(order_id)     ON DELETE CASCADE,
  CONSTRAINT fk_item_product FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 6. INVENTORY_TRANSACTIONS (audit log of every stock movement) --
CREATE TABLE inventory_transactions (
  txn_id       INT AUTO_INCREMENT PRIMARY KEY,
  product_id   INT NOT NULL,
  change_qty   INT NOT NULL,                        -- +ve = stock in, -ve = stock out
  reason       ENUM('INITIAL','RESTOCK','ADJUSTMENT','SALE','ORDER_CANCELLED') NOT NULL,
  order_id     INT NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_txn_product FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
  CONSTRAINT fk_txn_order   FOREIGN KEY (order_id)   REFERENCES orders(order_id)     ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX idx_txn_product ON inventory_transactions(product_id);

-- ============================================================
--  VIEWS (saved SELECT queries - good to mention in your viva)
-- ============================================================

-- Products that need attention (low or out of stock)
CREATE VIEW v_low_stock AS
SELECT p.product_id, p.name, c.name AS category, p.stock_qty,
       CASE WHEN p.stock_qty = 0 THEN 'Out of stock' ELSE 'Low stock' END AS level
FROM products p
JOIN categories c ON c.category_id = p.category_id
WHERE p.is_active = 1 AND p.stock_qty <= 10;

-- Revenue per category (cancelled orders excluded)
CREATE VIEW v_revenue_by_category AS
SELECT c.name AS category,
       COALESCE(SUM(x.quantity), 0)                AS units_sold,
       COALESCE(SUM(x.quantity * x.unit_price), 0) AS revenue
FROM categories c
LEFT JOIN products p ON p.category_id = c.category_id
LEFT JOIN (
    SELECT oi.product_id, oi.quantity, oi.unit_price
    FROM order_items oi
    JOIN orders o ON o.order_id = oi.order_id
    WHERE o.status <> 'Cancelled'
) x ON x.product_id = p.product_id
GROUP BY c.category_id, c.name;