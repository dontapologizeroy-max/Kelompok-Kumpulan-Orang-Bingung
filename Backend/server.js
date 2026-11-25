require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { ApolloServer } = require("@apollo/server");
const { expressMiddleware } = require("@as-integrations/express4");
const sequelize = require("./src/config/database");
const typeDefs = require("./src/graphql/typeDefs");
const resolvers = require("./src/graphql/resolvers");
const createAuthContext = require("./src/middlewares/authContext");

async function startServer() {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET must be configured.");
  }

  const app = express();
  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();
  await sequelize.authenticate();

  app.use(
    "/graphql",
    cors({
      origin: process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
        : "http://localhost:3000"
    }),
    express.json(),
    expressMiddleware(server, { context: createAuthContext })
  );

  const port = Number(process.env.PORT || 4000);
  const httpServer = app.listen(port, () => {
    console.log(`GraphQL server ready at http://localhost:${port}/graphql`);
  });

  const shutdown = async () => {
    httpServer.close();
    await server.stop();
    await sequelize.close();
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exitCode = 1;
});
