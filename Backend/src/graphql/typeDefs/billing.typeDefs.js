const { gql } = require("graphql-tag");

module.exports = gql`
  enum PaymentMethod {
    TUNAI
    QRIS
    TRANSFER
  }

  enum VoucherStatus {
    TERSEDIA
    TERPAKAI
    KADALUARSA
  }

  enum BillingType {
    PRABAYAR
    OPEN_BILLING
    MEMBER_BALANCE
  }

  enum SessionStatus {
    AKTIF
    SELESAI
    DIBATALKAN
  }

  type BillingPackage {
    id: ID!
    zone: Zone!
    code: String!
    name: String!
    durationMinutes: Int!
    price: Float!
    isMemberOnly: Boolean!
    isActive: Boolean!
    createdAt: String
  }

  type Voucher {
    id: ID!
    package: BillingPackage!
    creator: User!
    voucherCode: String!
    durationMinutes: Int!
    price: Float!
    status: VoucherStatus!
    usedAt: String
    createdAt: String
  }

  type BillingSession {
    id: ID!
    sessionNumber: String!
    computer: Computer!
    member: Member
    voucher: Voucher
    package: BillingPackage
    operator: User!
    billingType: BillingType!
    startTime: String!
    endTime: String
    durationMinutes: Int!
    totalBillingCost: Float!
    status: SessionStatus!
    extensions: [SessionExtension!]!
    payments: [Payment!]!
    createdAt: String
  }

  type SessionExtension {
    id: ID!
    package: BillingPackage
    addedMinutes: Int!
    additionalCost: Float!
    extendedAt: String
  }

  type Payment {
    id: ID!
    paymentNumber: String!
    shiftId: ID!
    billingSessionId: ID
    fbOrderId: ID
    memberId: ID
    paymentType: String!
    paymentMethod: PaymentMethod!
    amount: Float!
    paidAt: String
  }

  input PackageInput {
    zoneId: ID
    code: String
    name: String
    durationMinutes: Int
    price: Float
    isMemberOnly: Boolean
    isActive: Boolean
  }

  input StartSessionInput {
    computerId: ID!
    billingType: BillingType!
    memberId: ID
    packageId: ID
    voucherCode: String
    paymentMethod: PaymentMethod
  }

  extend type Query {
    billingPackages(zoneId: ID, isActive: Boolean): [BillingPackage!]!
    vouchers(status: VoucherStatus): [Voucher!]!
    activeSessions: [BillingSession!]!
    sessionHistory(memberId: ID, computerId: ID, dateFrom: String, dateTo: String): [BillingSession!]!
  }

  extend type Mutation {
    createBillingPackage(input: PackageInput!): BillingPackage!
    updateBillingPackage(id: ID!, input: PackageInput!): BillingPackage!
    generateVouchers(packageId: ID!, quantity: Int!): [Voucher!]!
    topUpMember(memberId: ID!, amount: Float!, minutes: Int, method: PaymentMethod!): Payment!
    startSession(input: StartSessionInput!): BillingSession!
    extendSession(sessionId: ID!, extraMinutes: Int!, packageId: ID): BillingSession!
    moveSessionPc(sessionId: ID!, targetComputerId: ID!): BillingSession!
    stopSession(sessionId: ID!, paymentMethod: PaymentMethod): BillingSession!
  }
`;
