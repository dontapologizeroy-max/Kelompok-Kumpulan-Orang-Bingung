const jwt = require("jsonwebtoken");
const { GraphQLError } = require("graphql");

const STAFF_ROLES = new Set(["ADMIN", "OPERATOR", "TEKNISI", "OWNER"]);

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
    const id = Number(payload.sub);
    const validId =
      typeof payload.sub === "string" &&
      /^[1-9]\d*$/.test(payload.sub) &&
      Number.isSafeInteger(id);
    const validRole =
      (payload.type === "staff" && STAFF_ROLES.has(payload.role)) ||
      (payload.type === "member" && payload.role === "MEMBER");
    if (!validId || !validRole) {
      throw new Error("Invalid token claims.");
    }
    return {
      user: {
        id,
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
