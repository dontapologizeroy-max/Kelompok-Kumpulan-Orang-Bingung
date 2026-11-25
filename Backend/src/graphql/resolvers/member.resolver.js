const bcrypt = require("bcrypt");
const { randomBytes } = require("crypto");
const { Op } = require("sequelize");
const jwt = require("jsonwebtoken");
const { Member, sequelize } = require("../../models");
const { requireAuth, requireRole } = require("../../middlewares/roleGuard");
const { badRequest, notFound, parseId } = require("../utils");

const SALT_ROUNDS = 12;

function createMemberToken(member) {
  return jwt.sign(
    { role: "MEMBER", type: "member" },
    process.env.JWT_SECRET,
    {
      subject: String(member.id),
      expiresIn: process.env.JWT_EXPIRES_IN || "8h"
    }
  );
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
    myMemberProfile: async (_parent, _args, { user }) => {
      requireRole(user, "MEMBER");
      if (user.type !== "member") {
        throw badRequest("A member account is required.");
      }
      return Member.findByPk(parseId(user.id));
    },
    members: async (_parent, { search, isActive }, { user }) => {
      requireRole(user, "ADMIN", "OPERATOR", "OWNER");
      const where = {};
      if (typeof isActive === "boolean") {
        where.isActive = isActive;
      }
      if (search && search.trim()) {
        const pattern = `%${search.trim()}%`;
        where[Op.or] = [
          { memberCode: { [Op.like]: pattern } },
          { username: { [Op.like]: pattern } },
          { fullName: { [Op.like]: pattern } }
        ];
      }
      return Member.findAll({ where, order: [["id", "ASC"]] });
    },
    member: async (_parent, { id }, { user }) => {
      requireAuth(user);
      const memberId = parseId(id);
      if (user.type === "member") {
        if (user.id !== memberId) {
          requireRole(user, "ADMIN", "OPERATOR", "OWNER");
        }
      } else {
        requireRole(user, "ADMIN", "OPERATOR", "OWNER");
      }
      const member = await Member.findByPk(memberId);
      if (!member) {
        throw notFound("Member");
      }
      return member;
    }
  },
  Mutation: {
    loginMember: async (_parent, { username, password }) => {
      if (!username.trim() || !password) {
        throw badRequest("Username and password are required.");
      }
      const member = await Member.findOne({ where: { username: username.trim() } });
      if (!member || !member.isActive || !(await bcrypt.compare(password, member.password))) {
        throw badRequest("Invalid username or password.");
      }
      return { token: createMemberToken(member), member };
    },
    createMember: async (_parent, { input }) => {
      const username = input.username.trim();
      const fullName = input.fullName.trim();
      if (!username || !fullName) {
        throw badRequest("Username and full name are required.");
      }
      validatePassword(input.password);

      const member = await sequelize.transaction(async (transaction) => {
        const created = await Member.create(
          {
            memberCode: `TMP-${randomBytes(12).toString("hex")}`,
            username,
            password: await bcrypt.hash(input.password, SALT_ROUNDS),
            fullName,
            phone: cleanOptional(input.phone),
            email: cleanOptional(input.email),
            isActive: true
          },
          { transaction }
        );

        let sequence = created.id;
        let memberCode;
        do {
          memberCode = `MBR-${String(sequence).padStart(3, "0")}`;
          sequence += 1;
        } while (await Member.findOne({ where: { memberCode }, transaction }));

        await created.update({ memberCode }, { transaction });
        return created;
      });
      return member;
    },
    updateMember: async (_parent, { id, input }, { user }) => {
      requireAuth(user);
      const memberId = parseId(id);
      if (user.type === "member") {
        if (user.id !== memberId) {
          requireRole(user, "ADMIN", "OPERATOR");
        }
      } else {
        requireRole(user, "ADMIN", "OPERATOR");
      }

      const member = await Member.findByPk(memberId);
      if (!member) {
        throw notFound("Member");
      }

      const changes = {};
      for (const field of ["username", "fullName", "phone", "email"]) {
        if (input[field] !== undefined) {
          const value = cleanOptional(input[field]);
          if (["username", "fullName"].includes(field) && !value) {
            throw badRequest(`${field} cannot be empty.`);
          }
          changes[field] = value;
        }
      }
      if (input.password !== undefined) {
        validatePassword(input.password);
        changes.password = await bcrypt.hash(input.password, SALT_ROUNDS);
      }
      if (Object.keys(changes).length === 0) {
        throw badRequest("At least one member field must be provided.");
      }

      await member.update(changes);
      return member;
    }
  }
};

module.exports = resolvers;
