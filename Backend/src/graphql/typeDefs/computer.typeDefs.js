const { gql } = require("graphql-tag");

module.exports = gql`
  enum PcStatus {
    TERSEDIA
    DIGUNAKAN
    MAINTENANCE
    OFFLINE
  }

  type Zone {
    id: ID!
    code: String!
    name: String!
    hourlyRate: Float!
    description: String
    isActive: Boolean!
    createdAt: String
  }

  type Computer {
    id: ID!
    zone: Zone!
    pcCode: String!
    pcName: String!
    ipAddress: String
    macAddress: String
    specifications: String
    status: PcStatus!
    createdAt: String
    updatedAt: String
  }

  input ZoneInput {
    code: String!
    name: String!
    hourlyRate: Float!
    description: String
    isActive: Boolean
  }

  input ZoneUpdateInput {
    code: String
    name: String
    hourlyRate: Float
    description: String
    isActive: Boolean
  }

  input ComputerInput {
    zoneId: ID!
    pcCode: String!
    pcName: String!
    ipAddress: String
    macAddress: String
    specifications: String
  }

  extend type Query {
    zones: [Zone!]!
    computers(zoneId: ID, status: PcStatus): [Computer!]!
    computer(id: ID!): Computer
  }

  extend type Mutation {
    createZone(input: ZoneInput!): Zone!
    updateZone(id: ID!, input: ZoneUpdateInput!): Zone!
    deleteZone(id: ID!): Boolean!
    createComputer(input: ComputerInput!): Computer!
    updateComputer(id: ID!, input: ComputerInput!): Computer!
    updateComputerStatus(id: ID!, status: PcStatus!): Computer!
    deleteComputer(id: ID!): Boolean!
  }
`;
