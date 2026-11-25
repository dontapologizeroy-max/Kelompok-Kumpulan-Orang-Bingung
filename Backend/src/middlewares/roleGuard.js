const { GraphQLError } = require("graphql");

function requireAuth(user) {
  if (!user) {
    throw new GraphQLError("Authentication is required.", {
      extensions: { code: "UNAUTHENTICATED" }
    });
  }
  return user;
}

function requireRole(user, ...roles) {
  requireAuth(user);
  if (!roles.includes(user.role)) {
    throw new GraphQLError("You do not have permission to perform this action.", {
      extensions: { code: "FORBIDDEN" }
    });
  }
  return user;
}

module.exports = { requireAuth, requireRole };
