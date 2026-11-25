const { gql } = require("graphql-tag");

module.exports = gql`
  type Member {
    id: ID!
    memberCode: String!
    username: String!
    fullName: String!
    phone: String
    email: String
    balance: Float!
    remainingMinutes: Int!
    points: Int!
    isActive: Boolean!
    createdAt: String
    updatedAt: String
  }

  type MemberAuthPayload {
    token: String!
    member: Member!
  }

  input CreateMemberInput {
    username: String!
    password: String!
    fullName: String!
    phone: String
    email: String
  }

  input UpdateMemberInput {
    username: String
    password: String
    fullName: String
    phone: String
    email: String
  }

  extend type Query {
    myMemberProfile: Member
    members(search: String, isActive: Boolean): [Member!]!
    member(id: ID!): Member
  }

  extend type Mutation {
    loginMember(username: String!, password: String!): MemberAuthPayload!
    createMember(input: CreateMemberInput!): Member!
    updateMember(id: ID!, input: UpdateMemberInput!): Member!
  }
`;
