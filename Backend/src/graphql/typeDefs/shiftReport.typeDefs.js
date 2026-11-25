const { gql } = require("graphql-tag");

module.exports = gql`
  enum ReportFormat {
    PDF
    XLSX
  }

  type OperatorShift {
    id: ID!
    userId: ID!
    startTime: String
    endTime: String
    startingCash: Float!
    endingCash: Float!
    systemExpectedCash: Float!
    notes: String
    status: String!
  }

  type RevenueSummary {
    startDate: String!
    endDate: String!
    billingRevenue: Float!
    fbRevenue: Float!
    topUpRevenue: Float!
    combinedRevenue: Float!
    totalRevenue: Float!
    paymentCount: Int!
  }

  type ComputerOccupancy {
    computerId: ID!
    pcCode: String!
    pcName: String!
    sessionCount: Int!
    occupiedMinutes: Int!
  }

  type PeakHourOccupancy {
    hourOfDay: Int!
    sessionCount: Int!
    occupiedMinutes: Int!
  }

  type OccupancySummary {
    startDate: String!
    endDate: String!
    totalComputers: Int!
    totalSessions: Int!
    occupiedMinutes: Int!
    availableMinutes: Int!
    occupancyRate: Float!
    computers: [ComputerOccupancy!]!
    peakHours: [PeakHourOccupancy!]!
  }

  type ReportFile {
    fileName: String!
    mimeType: String!
    contentBase64: String!
  }

  extend type Query {
    currentShift: OperatorShift
    shiftHistory: [OperatorShift!]!
    revenueReport(startDate: String!, endDate: String!): RevenueSummary!
    occupancyReport(startDate: String!, endDate: String!): OccupancySummary!
  }

  extend type Mutation {
    openShift(startingCash: Float!): OperatorShift!
    closeShift(endingCash: Float!, notes: String): OperatorShift!
    exportRevenueReport(startDate: String!, endDate: String!, format: ReportFormat!): ReportFile!
    exportOccupancyReport(startDate: String!, endDate: String!, format: ReportFormat!): ReportFile!
  }
`;