const jwt = require("jsonwebtoken");
const { GraphQLError } = require("graphql");

function createAuthContext({ req }) {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return { user: null };
  }

  const [scheme, token, ...extra] = authorization.trim().split(/\s+/);
  if (scheme !== "Bearer" || !token || extra.length > 0) {
    throw new GraphQLError("Authorization header must use Bearer token format.", {
      extensions: { code: "UNAUTHENTICATED" }
    });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!payload.sub || !payload.role || !["staff", "member"].includes(payload.type)) {
      throw new Error("Invalid token claims.");
    }
    return {
      user: {
        id: Number(payload.sub),
        role: payload.role,
        type: payload.type
      }
    };
  } catch (error) {
    throw new GraphQLError("Invalid or expired authentication token.", {
      extensions: { code: "UNAUTHENTICATED" },
      originalError: error
    });
  }
}

module.exports = createAuthContext;
