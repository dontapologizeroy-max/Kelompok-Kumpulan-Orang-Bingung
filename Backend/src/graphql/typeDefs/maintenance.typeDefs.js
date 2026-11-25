const { gql } = require("graphql-tag");

module.exports = gql`
  enum MaintenanceStatus {
    DILAPORKAN
    DIPERBAIKI
    SELESAI
  }

  type PcMaintenance {
    id: ID!
    computerId: ID!
    reportedBy: ID!
    technicianId: ID
    issueDescription: String!
    actionTaken: String
    cost: Float!
    status: MaintenanceStatus!
    reportedAt: String
    resolvedAt: String
  }

  extend type Query {
    pcMaintenances(status: MaintenanceStatus): [PcMaintenance!]!
  }

  extend type Mutation {
    reportPcIssue(computerId: ID!, issueDescription: String!): PcMaintenance!
    assignTechnician(maintenanceId: ID!, technicianId: ID!): PcMaintenance!
    resolvePcIssue(id: ID!, actionTaken: String!, cost: Float): PcMaintenance!
  }
`;