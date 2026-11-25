const { GraphQLError } = require("graphql");

function parseId(value, label = "id") {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new GraphQLError(`${label} must be a positive integer.`, {
      extensions: { code: "BAD_USER_INPUT" }
    });
  }
  return id;
}

function notFound(entity) {
  return new GraphQLError(`${entity} was not found.`, {
    extensions: { code: "NOT_FOUND" }
  });
}

function badRequest(message) {
  return new GraphQLError(message, {
    extensions: { code: "BAD_USER_INPUT" }
  });
}

function conflict(message) {
  return new GraphQLError(message, {
    extensions: { code: "CONFLICT" }
  });
}

module.exports = { parseId, notFound, badRequest, conflict };
