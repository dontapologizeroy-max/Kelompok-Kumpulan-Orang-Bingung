const { Op, fn, col } = require("sequelize");
const { OperatorShift, Payment, Computer, BillingSession, sequelize } = require("../../models");
const { requireRole } = require("../../middlewares/roleGuard");
const { badRequest, conflict, notFound } = require("../utils");

const STAFF_ROLES = ["ADMIN", "OPERATOR", "TEKNISI", "OWNER"];

function parseDateRange(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw badRequest("Report dates must be valid date strings.");
  }
  const endExclusive = new Date(end);
  if (/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
  } else {
    endExclusive.setTime(endExclusive.getTime() + 1);
  }
  if (start >= endExclusive) throw badRequest("The report start date must not be after its end date.");
  return { start, endExclusive, durationMinutes: Math.ceil((endExclusive - start) / 60000) };
}

function numericAmount(value) {
  return Number(value || 0);
}

const resolvers = {
  Query: {
    currentShift: async (_parent, _args, { user }) => {
      requireRole(user, ...STAFF_ROLES);
      return OperatorShift.findOne({
        where: { userId: user.id, status: "BUKA" },
        order: [["startTime", "DESC"]]
      });
    },
    shiftHistory: async (_parent, _args, { user }) => {
      requireRole(user, ...STAFF_ROLES);
      const where = user.role === "ADMIN" || user.role === "OWNER" ? {} : { userId: user.id };
      return OperatorShift.findAll({ where, order: [["startTime", "DESC"]] });
    },
    revenueReport: async (_parent, { startDate, endDate }, { user }) => {
      requireRole(user, "ADMIN", "OWNER");
      const range = parseDateRange(startDate, endDate);
      const where = { paidAt: { [Op.gte]: range.start, [Op.lt]: range.endExclusive } };
      const groups = await Payment.findAll({
        attributes: ["paymentType", [fn("SUM", col("amount")), "amount"]],
        where,
        group: ["paymentType"]
      });
      const totals = new Map(groups.map((entry) => [entry.paymentType, numericAmount(entry.get("amount").toString())]));
      const billingRevenue = totals.get("BILLING") || 0;
      const fbRevenue = totals.get("FNB") || 0;
      const topUpRevenue = totals.get("TOPUP_MEMBER") || 0;
      const combinedRevenue = totals.get("GABUNGAN") || 0;
      const paymentCount = await Payment.count({ where });
      return {
        startDate,
        endDate,
        billingRevenue,
        fbRevenue,
        topUpRevenue,
        combinedRevenue,
        totalRevenue: billingRevenue + fbRevenue + topUpRevenue + combinedRevenue,
        paymentCount
      };
    },
    occupancyReport: async (_parent, { startDate, endDate }, { user }) => {
      requireRole(user, "ADMIN", "OWNER");
      const range = parseDateRange(startDate, endDate);
      const [computers, sessions] = await Promise.all([
        Computer.findAll({ attributes: ["id", "pcCode", "pcName"], order: [["pcCode", "ASC"]] }),
        BillingSession.findAll({
          attributes: ["computerId", "startTime", "endTime"],
          where: {
            status: { [Op.ne]: "DIBATALKAN" },
            startTime: { [Op.lt]: range.endExclusive },
            [Op.or]: [{ endTime: null }, { endTime: { [Op.gt]: range.start } }]
          }
        })
      ]);
      const now = new Date();
      const occupancyById = new Map(computers.map((computer) => [computer.id, { sessionCount: 0, occupiedMinutes: 0 }]));
      const hourlyOccupancy = new Map();
      for (const session of sessions) {
        const totals = occupancyById.get(session.computerId);
        if (!totals) continue;
        const sessionStart = new Date(session.startTime);
        const sessionEnd = session.endTime ? new Date(session.endTime) : now;
        const overlapStart = Math.max(sessionStart.getTime(), range.start.getTime());
        const overlapEnd = Math.min(sessionEnd.getTime(), range.endExclusive.getTime());
        if (overlapEnd <= overlapStart) continue;
        totals.sessionCount += 1;
        totals.occupiedMinutes += Math.floor((overlapEnd - overlapStart) / 60000);

        const sessionHours = new Set();
        let cursor = overlapStart;
        while (cursor < overlapEnd) {
          const current = new Date(cursor);
          const hourOfDay = current.getUTCHours();
          const nextHour = Date.UTC(
            current.getUTCFullYear(),
            current.getUTCMonth(),
            current.getUTCDate(),
            hourOfDay + 1
          );
          const segmentEnd = Math.min(nextHour, overlapEnd);
          const minutes = Math.floor((segmentEnd - cursor) / 60000);
          const hourTotals = hourlyOccupancy.get(hourOfDay) || { sessionCount: 0, occupiedMinutes: 0 };
          hourTotals.occupiedMinutes += minutes;
          hourlyOccupancy.set(hourOfDay, hourTotals);
          sessionHours.add(hourOfDay);
          cursor = segmentEnd;
        }
        for (const hourOfDay of sessionHours) {
          hourlyOccupancy.get(hourOfDay).sessionCount += 1;
        }
      }
      const computerRows = computers.map((computer) => ({
        computerId: computer.id,
        pcCode: computer.pcCode,
        pcName: computer.pcName,
        ...occupancyById.get(computer.id)
      })).sort((left, right) => right.occupiedMinutes - left.occupiedMinutes);
      const totalSessions = computerRows.reduce((total, computer) => total + computer.sessionCount, 0);
      const occupiedMinutes = computerRows.reduce((total, computer) => total + computer.occupiedMinutes, 0);
      const capacityMinutes = computers.length * range.durationMinutes;
      const peakHours = [...hourlyOccupancy.entries()]
        .map(([hourOfDay, values]) => ({ hourOfDay, ...values }))
        .filter((hour) => hour.occupiedMinutes > 0)
        .sort((left, right) => right.occupiedMinutes - left.occupiedMinutes || right.sessionCount - left.sessionCount)
        .slice(0, 3);
      return {
        startDate,
        endDate,
        totalComputers: computers.length,
        totalSessions,
        occupiedMinutes,
        availableMinutes: Math.max(0, capacityMinutes - occupiedMinutes),
        occupancyRate: capacityMinutes ? Number(((occupiedMinutes / capacityMinutes) * 100).toFixed(2)) : 0,
        computers: computerRows,
        peakHours
      };
    }
  },
  Mutation: {
    openShift: async (_parent, { startingCash }, { user }) => {
      requireRole(user, "ADMIN", "OPERATOR");
      if (!Number.isFinite(startingCash) || startingCash < 0) {
        throw badRequest("Starting cash must be a non-negative number.");
      }
      return sequelize.transaction(async (transaction) => {
        const openShift = await OperatorShift.findOne({
          where: { userId: user.id, status: "BUKA" },
          transaction,
          lock: transaction.LOCK.UPDATE
        });
        if (openShift) throw conflict("You already have an open shift.");
        return OperatorShift.create({ userId: user.id, startingCash }, { transaction });
      });
    },
    closeShift: async (_parent, { endingCash, notes }, { user }) => {
      requireRole(user, "ADMIN", "OPERATOR");
      if (!Number.isFinite(endingCash) || endingCash < 0) {
        throw badRequest("Ending cash must be a non-negative number.");
      }
      return sequelize.transaction(async (transaction) => {
        const shift = await OperatorShift.findOne({
          where: { userId: user.id, status: "BUKA" },
          order: [["startTime", "DESC"]],
          transaction,
          lock: transaction.LOCK.UPDATE
        });
        if (!shift) throw notFound("Open shift");
        const paymentTotal = numericAmount(await Payment.sum("amount", {
          where: { shiftId: shift.id, paymentMethod: "TUNAI" },
          transaction
        }));
        await shift.update({
          endingCash,
          systemExpectedCash: numericAmount(shift.startingCash) + paymentTotal,
          notes: notes?.trim() || null,
          endTime: new Date(),
          status: "TUTUP"
        }, { transaction });
        return shift;
      });
    }
  }
};

module.exports = resolvers;