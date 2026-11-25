# Warnet Management GraphQL API

GraphQL API for the warnet management system, built with Node.js, Express,
Apollo Server, Sequelize, and MySQL.

## Requirements

- Node.js 20 or newer
- MySQL 8

## Setup

1. Install dependencies:

   ```sh
   npm install
   ```

2. Create the database tables and seed the built-in roles and default zones:

   ```sh
   mysql -u root -p < database/schema.sql
   ```

3. Copy `.env.example` to `.env`, then set the MySQL connection values and a
   long random `JWT_SECRET`.

4. Create the first administrator. Set `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and
   `ADMIN_FULL_NAME` in the environment first:

   ```sh
   npm run create-admin
   ```

5. Start the server:

   ```sh
   npm run dev
   ```

The GraphQL endpoint is `http://localhost:4000/graphql`. Database schema
synchronization is intentionally not run automatically; use the reviewed SQL
script instead.

## Implemented areas

- Staff and member login, JWT authentication, and role-based authorization
- Member registration, profile and balance/loyalty lookup
- Zone, PC, and billing-package management
- Prepaid packages, vouchers, member top-ups, and PC billing sessions
- F&B inventory and orders, including session-end combined payments
- PC maintenance tickets and technician assignment
- Cashier shifts, revenue and PC occupancy reports
- PDF and Excel report exports through `exportRevenueReport` and
  `exportOccupancyReport`

Run the backend tests with `npm test` from this directory.

See [GRAPHQL_TEST_QUERIES.md](./GRAPHQL_TEST_QUERIES.md) for copy-ready
GraphQL operations and JSON variables for every query and mutation.
