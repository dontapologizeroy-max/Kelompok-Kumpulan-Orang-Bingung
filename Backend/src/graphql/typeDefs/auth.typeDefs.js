const { gql } = require("graphql-tag");

module.exports = gql`
  enum StaffRole {
    ADMIN
    OPERATOR
    TEKNISI
    OWNER
  }

  type Role {
    id: ID!
    name: StaffRole!
    description: String
  }

  type User {
    id: ID!
    username: String!
    fullName: String!
    email: String
    phone: String
    isActive: Boolean!
    role: Role!
    createdAt: String
    updatedAt: String
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  input CreateUserInput {
    username: String!
    password: String!
    fullName: String!
    email: String
    phone: String
    role: StaffRole!
  }

  type Query {
    me: User
  }

  type Mutation {
    loginStaff(username: String!, password: String!): AuthPayload!
    createUser(input: CreateUserInput!): User!
  }
`;
