const assert = require("node:assert/strict");
const { test } = require("node:test");

process.env.DB_NAME = process.env.DB_NAME || "warnet_test";
process.env.DB_USER = process.env.DB_USER || "test";
process.env.JWT_SECRET = "backend-tests-only-secret";

const { ApolloServer } = require("@apollo/server");
const jwt = require("jsonwebtoken");
const createAuthContext = require("../src/middlewares/authContext");
const typeDefs = require("../src/graphql/typeDefs");
const resolvers = require("../src/graphql/resolvers");
const {
  calculateUncoveredMinutes
} = require("../src/utils/billingCalculator");
const {
  exportRevenuePdf,
  exportOccupancyExcel
} = require("../src/utils/reportExporter");

test("all scoped GraphQL modules compose and expose their resolvers", async () => {
  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();
  try {
    const result = await server.executeOperation({
      query: "{ __schema { queryType { fields { name } } mutationType { fields { name } } } }"
    });
    assert.equal(result.body.kind, "single");
    assert.equal(result.body.singleResult.errors, undefined);
    assert.ok(result.body.singleResult.data.__schema.queryType.fields.some(
      ({ name }) => name === "me"
    ));
    assert.ok(result.body.singleResult.data.__schema.queryType.fields.some(
      ({ name }) => name === "revenueReport"
    ));
    assert.ok(result.body.singleResult.data.__schema.mutationType.fields.some(
      ({ name }) => name === "stopSession"
    ));
    assert.ok(result.body.singleResult.data.__schema.mutationType.fields.some(
      ({ name }) => name === "exportOccupancyReport"
    ));
  } finally {
    await server.stop();
  }
});

test("JWT context rejects malformed identity and role claims", () => {
  const contextFor = (claims, subject) => {
    const token = jwt.sign(claims, process.env.JWT_SECRET, { subject });
    return createAuthContext({
      req: { headers: { authorization: `Bearer ${token}` } }
    });
  };

  assert.equal(contextFor({ role: "ADMIN", type: "staff" }, "7").user.id, 7);
  for (const [claims, subject] of [
    [{ role: "ADMIN", type: "staff" }, "not-an-id"],
    [{ role: "ROOT", type: "staff" }, "7"],
    [{ role: "ADMIN", type: "member" }, "7"]
  ]) {
    assert.throws(
      () => contextFor(claims, subject),
      (error) => error.extensions.code === "UNAUTHENTICATED"
    );
  }
});

test("billing extensions cover time only after they are added", () => {
  const start = Date.UTC(2026, 0, 1);
  const atMinute = (minutes) => new Date(start + minutes * 60000);

  assert.equal(calculateUncoveredMinutes(atMinute(0), atMinute(90), []), 90);
  assert.equal(
    calculateUncoveredMinutes(atMinute(0), atMinute(90), [
      { extendedAt: atMinute(30), addedMinutes: 60 }
    ]),
    30
  );
  assert.equal(
    calculateUncoveredMinutes(atMinute(0), atMinute(90), [
      { extendedAt: atMinute(120), addedMinutes: 60 }
    ]),
    90
  );
});

test("report exporters return PDF and Excel file data", async () => {
  const summary = {
    startDate: "2026-01-01",
    endDate: "2026-01-01",
    totalRevenue: 1200
  };
  const pdf = await exportRevenuePdf(summary);
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");

  const excel = await exportOccupancyExcel(
    { ...summary, computers: [], peakHours: [] }
  );
  assert.equal(excel.subarray(0, 2).toString(), "PK");
});
