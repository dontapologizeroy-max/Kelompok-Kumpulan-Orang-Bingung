const { Op } = require("sequelize");
const { PcMaintenance, Computer, User, Role, sequelize } = require("../../models");
const { requireRole } = require("../../middlewares/roleGuard");
const { badRequest, conflict, notFound, parseId } = require("../utils");

const resolvers = {
  Query: {
    pcMaintenances: async (_parent, { status }, { user }) => {
      requireRole(user, "ADMIN", "OPERATOR", "TEKNISI", "OWNER");
      const where = status ? { status } : {};
      return PcMaintenance.findAll({ where, order: [["reportedAt", "DESC"]] });
    }
  },
  Mutation: {
    reportPcIssue: async (_parent, { computerId, issueDescription }, { user }) => {
      requireRole(user, "ADMIN", "OPERATOR");
      const description = issueDescription.trim();
      if (!description) throw badRequest("Issue description cannot be empty.");
      return sequelize.transaction(async (transaction) => {
        const computer = await Computer.findByPk(parseId(computerId, "computerId"), {
          transaction,
          lock: transaction.LOCK.UPDATE
        });
        if (!computer) throw notFound("Computer");
        if (computer.status === "DIGUNAKAN") {
          throw conflict("Stop the active billing session before reporting this computer for maintenance.");
        }
        if (computer.status === "MAINTENANCE") {
          throw conflict("This computer already has an active maintenance status.");
        }
        const maintenance = await PcMaintenance.create({
          computerId: computer.id,
          reportedBy: user.id,
          issueDescription: description,
          status: "DILAPORKAN"
        }, { transaction });
        await computer.update({ status: "MAINTENANCE" }, { transaction });
        return maintenance;
      });
    },
    assignTechnician: async (_parent, { maintenanceId, technicianId }, { user }) => {
      requireRole(user, "ADMIN", "OPERATOR");
      return sequelize.transaction(async (transaction) => {
        const maintenance = await PcMaintenance.findByPk(parseId(maintenanceId, "maintenanceId"), {
          transaction,
          lock: transaction.LOCK.UPDATE
        });
        if (!maintenance) throw notFound("Maintenance ticket");
        if (maintenance.status === "SELESAI") throw conflict("A completed ticket cannot be reassigned.");

        const technician = await User.findByPk(parseId(technicianId, "technicianId"), {
          include: [{ model: Role, as: "role" }],
          transaction,
          lock: transaction.LOCK.UPDATE
        });
        if (!technician || !technician.isActive || technician.role?.name !== "TEKNISI") {
          throw badRequest("The selected user is not an active technician.");
        }
        await maintenance.update({ technicianId: technician.id, status: "DIPERBAIKI" }, { transaction });
        return maintenance;
      });
    },
    resolvePcIssue: async (_parent, { id, actionTaken, cost = 0 }, { user }) => {
      requireRole(user, "ADMIN", "TEKNISI");
      const action = actionTaken.trim();
      if (!action) throw badRequest("Action taken cannot be empty.");
      if (!Number.isFinite(Number(cost)) || Number(cost) < 0) {
        throw badRequest("Repair cost must be a non-negative number.");
      }
      return sequelize.transaction(async (transaction) => {
        const maintenance = await PcMaintenance.findByPk(parseId(id), {
          transaction,
          lock: transaction.LOCK.UPDATE
        });
        if (!maintenance) throw notFound("Maintenance ticket");
        if (maintenance.status === "SELESAI") throw conflict("This maintenance ticket is already complete.");
        if (user.role === "TEKNISI" && maintenance.technicianId !== user.id) {
          throw badRequest("Technicians may only resolve tickets assigned to them.");
        }
        const computer = await Computer.findByPk(maintenance.computerId, {
          transaction,
          lock: transaction.LOCK.UPDATE
        });
        if (!computer) throw notFound("Computer");

        await maintenance.update({
          actionTaken: action,
          cost: Number(cost),
          status: "SELESAI",
          resolvedAt: new Date()
        }, { transaction });
        const remainingTickets = await PcMaintenance.count({
          where: {
            computerId: computer.id,
            id: { [Op.ne]: maintenance.id },
            status: { [Op.ne]: "SELESAI" }
          },
          transaction
        });
        if (remainingTickets === 0) {
          await computer.update({ status: "TERSEDIA" }, { transaction });
        }
        return maintenance;
      });
    }
  }
};

module.exports = resolvers;