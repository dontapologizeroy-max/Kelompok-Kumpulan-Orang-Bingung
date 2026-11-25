const {
  Zone,
  Computer,
  BillingPackage,
  BillingSession,
  FbOrder,
  PcMaintenance
} = require("../../models");
const { requireRole } = require("../../middlewares/roleGuard");
const { badRequest, conflict, notFound, parseId } = require("../utils");

function positiveRate(value) {
  if (!Number.isFinite(Number(value)) || Number(value) <= 0) {
    throw badRequest("Hourly rate must be greater than zero.");
  }
}

function normalizeCode(value, field) {
  if (typeof value !== "string") {
    throw badRequest(`${field} must be a string.`);
  }
  const normalized = value.trim().toUpperCase();
  if (!normalized) {
    throw badRequest(`${field} cannot be empty.`);
  }
  return normalized;
}

const resolvers = {
  Query: {
    zones: async (_parent, _args, { user }) => {
      requireRole(user, "ADMIN", "OPERATOR", "TEKNISI", "OWNER");
      return Zone.findAll({ order: [["id", "ASC"]] });
    },
    computers: async (_parent, { zoneId, status }, { user }) => {
      requireRole(user, "ADMIN", "OPERATOR", "TEKNISI", "OWNER");
      const where = {};
      if (zoneId !== undefined && zoneId !== null) {
        where.zoneId = parseId(zoneId, "zoneId");
      }
      if (status) {
        where.status = status;
      }
      return Computer.findAll({
        where,
        include: [{ model: Zone, as: "zone" }],
        order: [["pcCode", "ASC"]]
      });
    },
    computer: async (_parent, { id }, { user }) => {
      requireRole(user, "ADMIN", "OPERATOR", "TEKNISI", "OWNER");
      return Computer.findByPk(parseId(id), {
        include: [{ model: Zone, as: "zone" }]
      });
    }
  },
  Mutation: {
    createZone: async (_parent, { input }, { user }) => {
      requireRole(user, "ADMIN");
      positiveRate(input.hourlyRate);
      const code = normalizeCode(input.code, "Zone code");
      const name = input.name.trim();
      if (!name) {
        throw badRequest("Zone name cannot be empty.");
      }
      return Zone.create({
        code,
        name,
        hourlyRate: input.hourlyRate,
        description: input.description?.trim() || null,
        isActive: input.isActive ?? true
      });
    },
    updateZone: async (_parent, { id, input }, { user }) => {
      requireRole(user, "ADMIN");
      const zone = await Zone.findByPk(parseId(id));
      if (!zone) {
        throw notFound("Zone");
      }
      const changes = {};
      if (input.code !== undefined) changes.code = normalizeCode(input.code, "Zone code");
      if (input.name !== undefined) {
        if (typeof input.name !== "string") {
          throw badRequest("Zone name must be a string.");
        }
        changes.name = input.name.trim();
        if (!changes.name) throw badRequest("Zone name cannot be empty.");
      }
      if (input.hourlyRate !== undefined) {
        positiveRate(input.hourlyRate);
        changes.hourlyRate = input.hourlyRate;
      }
      if (input.description !== undefined) changes.description = input.description?.trim() || null;
      if (input.isActive !== undefined) {
        if (typeof input.isActive !== "boolean") {
          throw badRequest("Zone active status must be a boolean.");
        }
        changes.isActive = input.isActive;
      }
      if (Object.keys(changes).length === 0) {
        throw badRequest("At least one zone field must be provided.");
      }
      await zone.update(changes);
      return zone;
    },
    deleteZone: async (_parent, { id }, { user }) => {
      requireRole(user, "ADMIN");
      const zoneId = parseId(id);
      const zone = await Zone.findByPk(zoneId);
      if (!zone) {
        throw notFound("Zone");
      }
      const [computerCount, packageCount] = await Promise.all([
        Computer.count({ where: { zoneId } }),
        BillingPackage.count({ where: { zoneId } })
      ]);
      if (computerCount || packageCount) {
        throw conflict("A zone referenced by computers or billing packages cannot be deleted.");
      }
      await zone.destroy();
      return true;
    },
    createComputer: async (_parent, { input }, { user }) => {
      requireRole(user, "ADMIN", "OPERATOR");
      const zoneId = parseId(input.zoneId, "zoneId");
      const zone = await Zone.findByPk(zoneId);
      if (!zone || !zone.isActive) {
        throw badRequest("The selected zone is unavailable.");
      }
      const pcCode = normalizeCode(input.pcCode, "PC code");
      const pcName = input.pcName.trim();
      if (!pcName) {
        throw badRequest("PC name cannot be empty.");
      }
      const computer = await Computer.create({
        zoneId,
        pcCode,
        pcName,
        ipAddress: input.ipAddress?.trim() || null,
        macAddress: input.macAddress?.trim() || null,
        specifications: input.specifications?.trim() || null
      });
      return Computer.findByPk(parseId(computer.id), {
        include: [{ model: Zone, as: "zone" }]
      });
    },
    updateComputer: async (_parent, { id, input }, { user }) => {
      requireRole(user, "ADMIN", "OPERATOR");
      const computerId = parseId(id);
      const computer = await Computer.findByPk(computerId);
      if (!computer) {
        throw notFound("Computer");
      }
      const zoneId = parseId(input.zoneId, "zoneId");
      const zone = await Zone.findByPk(zoneId);
      if (!zone || !zone.isActive) {
        throw badRequest("The selected zone is unavailable.");
      }
      const pcName = input.pcName.trim();
      if (!pcName) {
        throw badRequest("PC name cannot be empty.");
      }
      const changes = {
        zoneId,
        pcCode: normalizeCode(input.pcCode, "PC code"),
        pcName
      };
      for (const field of ["ipAddress", "macAddress", "specifications"]) {
        if (input[field] !== undefined) {
          changes[field] = input[field]?.trim() || null;
        }
      }
      await computer.update(changes);
      return Computer.findByPk(computerId, {
        include: [{ model: Zone, as: "zone" }]
      });
    },
    updateComputerStatus: async (_parent, { id, status }, { user }) => {
      requireRole(user, "ADMIN", "OPERATOR", "TEKNISI");
      const computer = await Computer.findByPk(parseId(id));
      if (!computer) {
        throw notFound("Computer");
      }
      await computer.update({ status });
      return Computer.findByPk(computer.id, {
        include: [{ model: Zone, as: "zone" }]
      });
    },
    deleteComputer: async (_parent, { id }, { user }) => {
      requireRole(user, "ADMIN");
      const computerId = parseId(id);
      const computer = await Computer.findByPk(computerId);
      if (!computer) {
        throw notFound("Computer");
      }
      if (computer.status === "DIGUNAKAN") {
        throw conflict("A computer in use cannot be deleted.");
      }
      const [sessionCount, orderCount, maintenanceCount] = await Promise.all([
        BillingSession.count({ where: { computerId } }),
        FbOrder.count({ where: { computerId } }),
        PcMaintenance.count({ where: { computerId } })
      ]);
      if (sessionCount || orderCount || maintenanceCount) {
        throw conflict("A computer with transaction or maintenance history cannot be deleted.");
      }
      await computer.destroy();
      return true;
    }
  }
};

module.exports = resolvers;
