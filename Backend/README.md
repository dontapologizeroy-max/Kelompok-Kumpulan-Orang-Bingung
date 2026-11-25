# Warnet Management GraphQL API

Backend API for the warnet management project. The current implementation covers Developer 1 (server foundation, authentication, member, zone, and computer management). Billing, F&B, maintenance, shifts, and reporting modules are not included.

## Requirements

- Node.js 20 or newer
- MySQL 8

## Setup

1. Install dependencies:

   ```sh
   npm install
   ```

2. Create the tables and seed the built-in roles and default zones:

   ```sh
   mysql -u root -p < database/schema.sql
   ```

3. Copy `.env.example` to `.env`, then set the MySQL connection values and a long random `JWT_SECRET`.

4. Create the first administrator. Set the three `ADMIN_*` values in your shell first; the script refuses to run if an administrator already exists:

   ```sh
   npm run create-admin
   ```

5. Start the server:

   ```sh
   npm run dev
   ```

The GraphQL endpoint is `http://localhost:4000/graphql`. Database schema synchronization is intentionally not run automatically; use the reviewed SQL script instead.

## Implemented GraphQL areas

- Staff and member login with JWT authentication and role checks
- Staff user creation (ADMIN only)
- Member registration, profile updates, member lookup, and member balances/loyalty fields
- Zone and PC unit CRUD/status management
- Sequelize models and relations for all 16 shared database tables

Mutations that change billing balances or cashier payments belong to the billing/payment modules and are not implemented here.
