const authResolvers = require("./auth.resolver");
const memberResolvers = require("./member.resolver");
const computerResolvers = require("./computer.resolver");

module.exports = {
  Query: {
    ...authResolvers.Query,
    ...memberResolvers.Query,
    ...computerResolvers.Query
  },
  Mutation: {
    ...authResolvers.Mutation,
    ...memberResolvers.Mutation,
    ...computerResolvers.Mutation
  }
};
