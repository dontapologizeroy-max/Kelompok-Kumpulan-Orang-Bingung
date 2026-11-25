const { gql } = require("graphql-tag");

module.exports = gql`
  enum PaymentStatus {
    BELUM_BAYAR
    LUNAS
  }

  enum PaymentMethod {
    TUNAI
    QRIS
    TRANSFER
  }

  enum FbOrderPaymentMode {
    LUNAS
    BELUM_BAYAR
  }

  type FbCategory {
    id: ID!
    name: String!
    description: String
    createdAt: String
    items: [FbItem!]!
  }

  type FbItem {
    id: ID!
    categoryId: ID!
    category: FbCategory!
    code: String!
    name: String!
    stock: Int!
    minimumStock: Int!
    price: Float!
    isActive: Boolean!
    createdAt: String
  }

  type FbOrderDetail {
    id: ID!
    fbItemId: ID!
    item: FbItem!
    quantity: Int!
    unitPrice: Float!
    subtotal: Float!
  }

  type FbOrder {
    id: ID!
    orderNumber: String!
    billingSessionId: ID
    computerId: ID
    operatorId: ID!
    orderDate: String
    totalAmount: Float!
    paymentStatus: PaymentStatus!
    details: [FbOrderDetail!]!
  }

  input FbItemInput {
    categoryId: ID!
    code: String!
    name: String!
    stock: Int
    minimumStock: Int
    price: Float!
    isActive: Boolean
  }

  input UpdateFbCategoryInput {
    name: String
    description: String
  }

  input UpdateFbItemInput {
    categoryId: ID
    code: String
    name: String
    stock: Int
    minimumStock: Int
    price: Float
    isActive: Boolean
  }

  input FbOrderLineInput {
    fbItemId: ID!
    quantity: Int!
  }

  input CreateFbOrderInput {
    billingSessionId: ID
    computerId: ID
    paymentMode: FbOrderPaymentMode!
    paymentMethod: PaymentMethod
    items: [FbOrderLineInput!]!
  }

  extend type Query {
    fbCategories: [FbCategory!]!
    fbItems(categoryId: ID, lowStockOnly: Boolean): [FbItem!]!
    fbOrders(status: PaymentStatus, sessionId: ID): [FbOrder!]!
  }

  extend type Mutation {
    createFbCategory(name: String!, description: String): FbCategory!
    updateFbCategory(id: ID!, input: UpdateFbCategoryInput!): FbCategory!
    deleteFbCategory(id: ID!): Boolean!
    createFbItem(input: FbItemInput!): FbItem!
    updateFbItem(id: ID!, input: UpdateFbItemInput!): FbItem!
    deleteFbItem(id: ID!): Boolean!
    updateFbStock(itemId: ID!, adjustment: Int!): FbItem!
    createFbOrder(input: CreateFbOrderInput!): FbOrder!
    payFbOrder(orderId: ID!, paymentMethod: PaymentMethod!): FbOrder!
  }
`;