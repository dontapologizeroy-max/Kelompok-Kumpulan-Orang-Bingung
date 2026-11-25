const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User, Role } = require("../../models");
const { requireAuth, requireRole } = require("../../middlewares/roleGuard");
const { badRequest, parseId } = require("../utils");

const SALT_ROUNDS = 12;

function createToken(id, role, type) {
  return jwt.sign({ role, type }, process.env.JWT_SECRET, {
    subject: String(id),
    expiresIn: process.env.JWT_EXPIRES_IN || "8h"
  });
}

function validatePassword(password) {
  if (typeof password !== "string" || password.length < 8) {
    throw badRequest("Password must contain at least 8 characters.");
  }
}

function cleanOptional(value) {
  return typeof value === "string" ? value.trim() || null : value;
}

const resolvers = {
  Query: {
    me: async (_parent, _args, { user }) => {
      requireAuth(user);
      if (user.type !== "staff") {
        return null;
      }
      return User.findByPk(parseId(user.id), {
        include: [{ model: Role, as: "role" }]
      });
    }
  },
  Mutation: {
    loginStaff: async (_parent, { username, password }) => {
      if (!username.trim() || !password) {
        throw badRequest("Username and password are required.");
      }
      const user = await User.findOne({
        where: { username: username.trim() },
        include: [{ model: Role, as: "role" }]
      });
      if (!user || !user.isActive || !(await bcrypt.compare(password, user.password))) {
        throw badRequest("Invalid username or password.");
      }
      return {
        token: createToken(user.id, user.role.name, "staff"),
        user
      };
    },
    createUser: async (_parent, { input }, { user }) => {
      requireRole(user, "ADMIN");
      const username = input.username.trim();
      const fullName = input.fullName.trim();
      if (!username || !fullName) {
        throw badRequest("Username and full name are required.");
      }
      validatePassword(input.password);

      const role = await Role.findOne({ where: { name: input.role } });
      if (!role) {
        throw badRequest("The selected staff role does not exist.");
      }
      const created = await User.create({
        roleId: role.id,
        username,
        password: await bcrypt.hash(input.password, SALT_ROUNDS),
        fullName,
        email: cleanOptional(input.email),
        phone: cleanOptional(input.phone),
        isActive: true
      });
      return User.findByPk(parseId(created.id), {
        include: [{ model: Role, as: "role" }]
      });
    }
  }
};

module.exports = resolvers;
