CREATE DATABASE IF NOT EXISTS warnet_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE warnet_db;

CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT IGNORE INTO roles (name, description) VALUES
  ('ADMIN', 'Administrator sistem penuh'),
  ('OPERATOR', 'Operator dan kasir warnet'),
  ('TEKNISI', 'Teknisi perawatan komputer dan jaringan'),
  ('OWNER', 'Pemilik warnet');

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role_id INT NOT NULL,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150),
  phone VARCHAR(30),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE TABLE IF NOT EXISTS members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_code VARCHAR(30) NOT NULL UNIQUE,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  phone VARCHAR(30),
  email VARCHAR(150),
  balance DECIMAL(15,2) DEFAULT 0,
  remaining_minutes INT DEFAULT 0,
  points INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS zones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  hourly_rate DECIMAL(15,2) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO zones (code, name, hourly_rate, description) VALUES
  ('REG', 'Reguler Zone', 5000.00, 'PC standar untuk browsing dan game ringan'),
  ('VIP', 'VIP Gaming Zone', 8000.00, 'PC spesifikasi tinggi monitor 144Hz+'),
  ('VVIP', 'Private / Bootcamp Room', 12000.00, 'Ruangan khusus tim esports');

CREATE TABLE IF NOT EXISTS computers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  zone_id INT NOT NULL,
  pc_code VARCHAR(20) NOT NULL UNIQUE,
  pc_name VARCHAR(100) NOT NULL,
  ip_address VARCHAR(45),
  mac_address VARCHAR(50),
  specifications TEXT,
  status ENUM('TERSEDIA', 'DIGUNAKAN', 'MAINTENANCE', 'OFFLINE') DEFAULT 'TERSEDIA',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (zone_id) REFERENCES zones(id)
);

CREATE TABLE IF NOT EXISTS billing_packages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  zone_id INT NOT NULL,
  code VARCHAR(30) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  duration_minutes INT NOT NULL,
  price DECIMAL(15,2) NOT NULL,
  is_member_only BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (zone_id) REFERENCES zones(id)
);

CREATE TABLE IF NOT EXISTS vouchers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  package_id INT NOT NULL,
  created_by INT NOT NULL,
  voucher_code VARCHAR(30) NOT NULL UNIQUE,
  duration_minutes INT NOT NULL,
  price DECIMAL(15,2) NOT NULL,
  status ENUM('TERSEDIA', 'TERPAKAI', 'KADALUARSA') DEFAULT 'TERSEDIA',
  used_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (package_id) REFERENCES billing_packages(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS operator_shifts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  end_time TIMESTAMP NULL,
  starting_cash DECIMAL(15,2) DEFAULT 0,
  ending_cash DECIMAL(15,2) DEFAULT 0,
  system_expected_cash DECIMAL(15,2) DEFAULT 0,
  notes TEXT,
  status ENUM('BUKA', 'TUTUP') DEFAULT 'BUKA',
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS billing_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_number VARCHAR(50) NOT NULL UNIQUE,
  computer_id INT NOT NULL,
  member_id INT NULL,
  voucher_id INT NULL,
  package_id INT NULL,
  operator_id INT NOT NULL,
  billing_type ENUM('PRABAYAR', 'OPEN_BILLING', 'MEMBER_BALANCE') NOT NULL,
  start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  end_time TIMESTAMP NULL,
  duration_minutes INT DEFAULT 0,
  total_billing_cost DECIMAL(15,2) DEFAULT 0,
  status ENUM('AKTIF', 'SELESAI', 'DIBATALKAN') DEFAULT 'AKTIF',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (computer_id) REFERENCES computers(id),
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (voucher_id) REFERENCES vouchers(id),
  FOREIGN KEY (package_id) REFERENCES billing_packages(id),
  FOREIGN KEY (operator_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS session_extensions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  billing_session_id INT NOT NULL,
  package_id INT NULL,
  added_minutes INT NOT NULL,
  additional_cost DECIMAL(15,2) NOT NULL,
  extended_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (billing_session_id) REFERENCES billing_sessions(id),
  FOREIGN KEY (package_id) REFERENCES billing_packages(id)
);

CREATE TABLE IF NOT EXISTS fb_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fb_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  code VARCHAR(30) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  stock INT DEFAULT 0,
  minimum_stock INT DEFAULT 5,
  price DECIMAL(15,2) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES fb_categories(id)
);

CREATE TABLE IF NOT EXISTS fb_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_number VARCHAR(50) NOT NULL UNIQUE,
  billing_session_id INT NULL,
  computer_id INT NULL,
  operator_id INT NOT NULL,
  order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  total_amount DECIMAL(15,2) DEFAULT 0,
  payment_status ENUM('BELUM_BAYAR', 'LUNAS') DEFAULT 'BELUM_BAYAR',
  FOREIGN KEY (billing_session_id) REFERENCES billing_sessions(id),
  FOREIGN KEY (computer_id) REFERENCES computers(id),
  FOREIGN KEY (operator_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS fb_order_details (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fb_order_id INT NOT NULL,
  fb_item_id INT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(15,2) NOT NULL,
  subtotal DECIMAL(15,2) NOT NULL,
  FOREIGN KEY (fb_order_id) REFERENCES fb_orders(id),
  FOREIGN KEY (fb_item_id) REFERENCES fb_items(id)
);

CREATE TABLE IF NOT EXISTS pc_maintenances (
  id INT AUTO_INCREMENT PRIMARY KEY,
  computer_id INT NOT NULL,
  reported_by INT NOT NULL,
  technician_id INT NULL,
  issue_description TEXT NOT NULL,
  action_taken TEXT,
  cost DECIMAL(15,2) DEFAULT 0,
  status ENUM('DILAPORKAN', 'DIPERBAIKI', 'SELESAI') DEFAULT 'DILAPORKAN',
  reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL,
  FOREIGN KEY (computer_id) REFERENCES computers(id),
  FOREIGN KEY (reported_by) REFERENCES users(id),
  FOREIGN KEY (technician_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  payment_number VARCHAR(50) NOT NULL UNIQUE,
  shift_id INT NOT NULL,
  billing_session_id INT NULL,
  fb_order_id INT NULL,
  member_id INT NULL,
  payment_type ENUM('BILLING', 'FNB', 'TOPUP_MEMBER', 'GABUNGAN') NOT NULL,
  payment_method ENUM('TUNAI', 'QRIS', 'TRANSFER') DEFAULT 'TUNAI',
  amount DECIMAL(15,2) NOT NULL,
  paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (shift_id) REFERENCES operator_shifts(id),
  FOREIGN KEY (billing_session_id) REFERENCES billing_sessions(id),
  FOREIGN KEY (fb_order_id) REFERENCES fb_orders(id),
  FOREIGN KEY (member_id) REFERENCES members(id)
);
