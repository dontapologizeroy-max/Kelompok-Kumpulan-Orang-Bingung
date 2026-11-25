const { Op } = require("sequelize");
const {
  BillingPackage,
  BillingSession,
  Computer,
  FbOrder,
  Member,
  OperatorShift,
  Payment,
  SessionExtension,
  User,
  Voucher,
  Zone,
  sequelize
} = require("../../models");
const { requireRole } = require("../../middlewares/roleGuard");
const { badRequest, conflict, notFound, parseId } = require("../utils");
const {
  calculateElapsedMinutes,
  calculateUncoveredMinutes,
  calculateMemberDebit,
  calculateOpenBilling,
  calculatePrepaidCost,
  roundMoney
} = require("../../utils/billingCalculator");
const {
  generatePaymentNumber,
  generateSessionNumber,
  generateVoucherCode
} = require("../../utils/codeGenerator");

const PACKAGE_INCLUDES = [{ model: Zone, as: "zone" }];
const VOUCHER_INCLUDES = [
  { model: BillingPackage, as: "package", include: PACKAGE_INCLUDES },
  { model: User, as: "creator" }
];

const SESSION_INCLUDES = [
  { model: Computer, as: "computer", include: [{ model: Zone, as: "zone" }] },
  { model: Member, as: "member" },
  { model: Voucher, as: "voucher", include: VOUCHER_INCLUDES },
  { model: BillingPackage, as: "package", include: [{ model: Zone, as: "zone" }] },
  { model: User, as: "operator" },
  {
    model: SessionExtension,
    as: "extensions",
    include: [{ model: BillingPackage, as: "package", include: PACKAGE_INCLUDES }]
  },
  { model: Payment, as: "payments" }
];

function requireBillingStaff(user) {
  return requireRole(user, "ADMIN", "OPERATOR");
}

function lockOptions(transaction) {
  return { transaction, lock: transaction.LOCK.UPDATE };
}

function validatePositiveInteger(value, label) {
  if (!Number.isSafeInteger(Number(value)) || Number(value) <= 0) {
    throw badRequest(`${label} must be a positive integer.`);
  }
  return Number(value);
}

function validateNonNegativeAmount(value, label) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    throw badRequest(`${label} must be a non-negative amount.`);
  }
  return roundMoney(amount);
}

function parseDate(value, label, endOfDay = false) {
  if (typeof value !== "string" || !value.trim()) {
    throw badRequest(`${label} must be a valid date string.`);
  }
  const normalized = value.trim();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(normalized)
    ? new Date(`${normalized}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`)
    : new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    throw badRequest(`${label} must be a valid date string.`);
  }
  return date;
}

function normalizeText(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw badRequest(`${label} cannot be empty.`);
  }
  return value.trim();
}

async function findActiveShift(userId, transaction) {
  const shift = await OperatorShift.findOne({
    where: { userId, status: "BUKA" },
    order: [["startTime", "DESC"]],
    ...lockOptions(transaction)
  });
  if (!shift) {
    throw conflict("An open operator shift is required for this transaction.");
  }
  return shift;
}

async function createPayment(
  { shiftId, billingSessionId = null, memberId = null, paymentType, paymentMethod, amount },
  transaction
) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      return await Payment.create(
        {
          paymentNumber: generatePaymentNumber(),
          shiftId,
          billingSessionId,
          memberId,
          paymentType,
          paymentMethod,
          amount: roundMoney(amount)
        },
        { transaction }
      );
    } catch (error) {
      if (error.name !== "SequelizeUniqueConstraintError" || attempt === 7) {
        throw error;
      }
    }
  }
  throw new Error("Unable to generate a unique payment number.");
}

async function loadSession(id) {
  return BillingSession.findByPk(id, { include: SESSION_INCLUDES });
}

async function getLockedSession(sessionId, transaction) {
  const session = await BillingSession.findByPk(sessionId, lockOptions(transaction));
  if (!session) {
    throw notFound("Billing session");
  }
  if (session.status !== "AKTIF") {
    throw conflict("Only active sessions can be changed.");
  }
  return session;
}

async function getLockedComputer(computerId, transaction) {
  const computer = await Computer.findByPk(computerId, lockOptions(transaction));
  if (!computer) {
    throw notFound("Computer");
  }
  return computer;
}

async function getLockedMember(memberId, transaction) {
  const member = await Member.findByPk(memberId, lockOptions(transaction));
  if (!member || !member.isActive) {
    throw notFound("Active member");
  }
  return member;
}

async function debitMember(member, amount, hourlyRate, transaction) {
  const debit = calculateMemberDebit(amount, member.remainingMinutes, hourlyRate);
  const balance = Number(member.balance);
  if (balance < debit.balanceToDeduct) {
    throw conflict("The member does not have enough balance or remaining minutes.");
  }
  await member.update(
    {
      remainingMinutes: member.remainingMinutes - debit.minuteCreditsUsed,
      balance: roundMoney(balance - debit.balanceToDeduct)
    },
    { transaction }
  );
  return debit;
}

function validatePackageValues(input, creating) {
  const fields = ["zoneId", "code", "name", "durationMinutes", "price"];
  if (creating) {
    for (const field of fields) {
      if (input[field] === undefined || input[field] === null) {
        throw badRequest(`${field} is required.`);
      }
    }
  }
  const changes = {};
  if (input.zoneId !== undefined) changes.zoneId = parseId(input.zoneId, "zoneId");
  if (input.code !== undefined) changes.code = normalizeText(input.code, "Package code").toUpperCase();
  if (input.name !== undefined) changes.name = normalizeText(input.name, "Package name");
  if (input.durationMinutes !== undefined) {
    changes.durationMinutes = validatePositiveInteger(input.durationMinutes, "durationMinutes");
  }
  if (input.price !== undefined) {
    changes.price = validateNonNegativeAmount(input.price, "price");
  }
  if (input.isMemberOnly !== undefined) {
    if (typeof input.isMemberOnly !== "boolean") {
      throw badRequest("isMemberOnly must be a boolean.");
    }
    changes.isMemberOnly = input.isMemberOnly;
  }
  if (input.isActive !== undefined) {
    if (typeof input.isActive !== "boolean") {
      throw badRequest("isActive must be a boolean.");
    }
    changes.isActive = input.isActive;
  }
  return changes;
}

const resolvers = {
  Query: {
    billingPackages: async (_parent, { zoneId, isActive }, { user }) => {
      requireRole(user, "ADMIN", "OPERATOR", "OWNER");
      const where = {};
      if (zoneId !== undefined && zoneId !== null) where.zoneId = parseId(zoneId, "zoneId");
      if (typeof isActive === "boolean") where.isActive = isActive;
      return BillingPackage.findAll({
        where,
        include: PACKAGE_INCLUDES,
        order: [["id", "ASC"]]
      });
    },
    vouchers: async (_parent, { status }, { user }) => {
      requireRole(user, "ADMIN", "OPERATOR", "OWNER");
      return Voucher.findAll({
        where: status ? { status } : {},
        include: VOUCHER_INCLUDES,
        order: [["id", "DESC"]]
      });
    },
    activeSessions: async (_parent, _args, { user }) => {
      requireRole(user, "ADMIN", "OPERATOR", "OWNER");
      return BillingSession.findAll({
        where: { status: "AKTIF" },
        include: SESSION_INCLUDES,
        order: [["startTime", "ASC"]]
      });
    },
    sessionHistory: async (
      _parent,
      { memberId, computerId, dateFrom, dateTo },
      { user }
    ) => {
      requireRole(user, "ADMIN", "OPERATOR", "OWNER");
      const where = {};
      if (memberId !== undefined && memberId !== null) {
        where.memberId = parseId(memberId, "memberId");
      }
      if (computerId !== undefined && computerId !== null) {
        where.computerId = parseId(computerId, "computerId");
      }
      if (dateFrom || dateTo) {
        where.startTime = {};
        if (dateFrom) where.startTime[Op.gte] = parseDate(dateFrom, "dateFrom");
        if (dateTo) where.startTime[Op.lte] = parseDate(dateTo, "dateTo", true);
      }
      return BillingSession.findAll({
        where,
        include: SESSION_INCLUDES,
        order: [["startTime", "DESC"]]
      });
    }
  },
  Mutation: {
    createBillingPackage: async (_parent, { input }, { user }) => {
      requireRole(user, "ADMIN", "OPERATOR");
      const values = validatePackageValues(input, true);
      return sequelize.transaction(async (transaction) => {
        const zone = await Zone.findByPk(values.zoneId, lockOptions(transaction));
        if (!zone || !zone.isActive) throw badRequest("The selected zone is unavailable.");
        const created = await BillingPackage.create(values, { transaction });
        return BillingPackage.findByPk(created.id, {
          include: PACKAGE_INCLUDES,
          transaction
        });
      });
    },
    updateBillingPackage: async (_parent, { id, input }, { user }) => {
      requireRole(user, "ADMIN", "OPERATOR");
      const packageId = parseId(id);
      const changes = validatePackageValues(input, false);
      if (Object.keys(changes).length === 0) {
        throw badRequest("At least one package field must be provided.");
      }
      return sequelize.transaction(async (transaction) => {
        const billingPackage = await BillingPackage.findByPk(packageId, lockOptions(transaction));
        if (!billingPackage) throw notFound("Billing package");
        if (changes.zoneId !== undefined) {
          const zone = await Zone.findByPk(changes.zoneId, lockOptions(transaction));
          if (!zone || !zone.isActive) throw badRequest("The selected zone is unavailable.");
        }
        await billingPackage.update(changes, { transaction });
        return BillingPackage.findByPk(packageId, {
          include: PACKAGE_INCLUDES,
          transaction
        });
      });
    },
    deleteBillingPackage: async (_parent, { id }, { user }) => {
      requireRole(user, "ADMIN");
      const packageId = parseId(id);
      return sequelize.transaction(async (transaction) => {
        const billingPackage = await BillingPackage.findByPk(
          packageId,
          lockOptions(transaction)
        );
        if (!billingPackage) throw notFound("Billing package");

        const [voucherCount, sessionCount, extensionCount] = await Promise.all([
          Voucher.count({ where: { packageId }, transaction }),
          BillingSession.count({ where: { packageId }, transaction }),
          SessionExtension.count({ where: { packageId }, transaction })
        ]);
        if (voucherCount || sessionCount || extensionCount) {
          throw conflict("A billing package referenced by vouchers or session history cannot be deleted.");
        }

        await billingPackage.destroy({ transaction });
        return true;
      });
    },
    generateVouchers: async (_parent, { packageId, quantity }, { user }) => {
      requireBillingStaff(user);
      const id = parseId(packageId, "packageId");
      const count = validatePositiveInteger(quantity, "quantity");
      if (count > 500) throw badRequest("quantity cannot exceed 500.");
      const voucherIds = await sequelize.transaction(async (transaction) => {
        const billingPackage = await BillingPackage.findByPk(id, lockOptions(transaction));
        if (!billingPackage || !billingPackage.isActive) {
          throw notFound("Active billing package");
        }
        if (billingPackage.isMemberOnly) {
          throw badRequest("Vouchers can only be generated for packages available to guests.");
        }
        for (let attempt = 0; attempt < 8; attempt += 1) {
          const codes = new Set();
          while (codes.size < count) codes.add(generateVoucherCode());
          try {
            const vouchers = await Voucher.bulkCreate(
              Array.from(codes, (voucherCode) => ({
                packageId: billingPackage.id,
                createdBy: parseId(user.id, "userId"),
                voucherCode,
                durationMinutes: billingPackage.durationMinutes,
                price: billingPackage.price,
                status: "TERSEDIA"
              })),
              { transaction }
            );
            return vouchers.map((voucher) => voucher.id);
          } catch (error) {
            if (error.name !== "SequelizeUniqueConstraintError" || attempt === 7) {
              throw error;
            }
          }
        }
        throw conflict("Unable to generate unique voucher codes. Please retry.");
      });
      return Voucher.findAll({
        where: { id: { [Op.in]: voucherIds } },
        include: VOUCHER_INCLUDES,
        order: [["id", "ASC"]]
      });
    },
    topUpMember: async (_parent, { memberId, amount, minutes, method }, { user }) => {
      requireBillingStaff(user);
      const id = parseId(memberId, "memberId");
      const money = validateNonNegativeAmount(amount, "amount");
      const addedMinutes = minutes === undefined || minutes === null
        ? 0
        : Number(minutes);
      if (!Number.isSafeInteger(addedMinutes) || addedMinutes < 0) {
        throw badRequest("minutes must be a non-negative integer.");
      }
      if (money === 0 && addedMinutes === 0) {
        throw badRequest("A positive amount or a positive number of minutes is required.");
      }
      return sequelize.transaction(async (transaction) => {
        const member = await getLockedMember(id, transaction);
        const shift = await findActiveShift(parseId(user.id, "userId"), transaction);
        await member.update(
          {
            balance: roundMoney(Number(member.balance) + money),
            remainingMinutes: member.remainingMinutes + addedMinutes
          },
          { transaction }
        );
        return createPayment(
          {
            shiftId: shift.id,
            memberId: member.id,
            paymentType: "TOPUP_MEMBER",
            paymentMethod: method,
            amount: money
          },
          transaction
        );
      });
    },
    startSession: async (_parent, { input }, { user }) => {
      requireBillingStaff(user);
      const computerId = parseId(input.computerId, "computerId");
      const requestedMemberId = input.memberId === undefined || input.memberId === null
        ? null
        : parseId(input.memberId, "memberId");
      const requestedPackageId = input.packageId === undefined || input.packageId === null
        ? null
        : parseId(input.packageId, "packageId");
      const voucherCode = input.voucherCode === undefined || input.voucherCode === null
        ? null
        : normalizeText(input.voucherCode, "voucherCode").toUpperCase();
      if (input.billingType === "PRABAYAR" && Boolean(requestedPackageId) === Boolean(voucherCode)) {
        throw badRequest("A prepaid session requires exactly one packageId or voucherCode.");
      }
      if (input.billingType !== "PRABAYAR" && (requestedPackageId || voucherCode)) {
        throw badRequest("Packages and vouchers can only be used for prepaid sessions.");
      }
      if (input.billingType === "MEMBER_BALANCE" && !requestedMemberId) {
        throw badRequest("A memberId is required for member-balance billing.");
      }

      const sessionId = await sequelize.transaction(async (transaction) => {
        const computer = await getLockedComputer(computerId, transaction);
        if (computer.status !== "TERSEDIA") {
          throw conflict("The selected computer is not available.");
        }
        const zone = await Zone.findByPk(computer.zoneId, lockOptions(transaction));
        if (!zone || !zone.isActive) throw conflict("The computer's zone is unavailable.");
        const member = requestedMemberId
          ? await getLockedMember(requestedMemberId, transaction)
          : null;
        const shift = input.billingType === "PRABAYAR"
          ? await findActiveShift(parseId(user.id, "userId"), transaction)
          : null;

        let billingPackage = null;
        let voucher = null;
        let durationMinutes = 0;
        let initialCost = 0;
        if (requestedPackageId) {
          billingPackage = await BillingPackage.findByPk(
            requestedPackageId,
            lockOptions(transaction)
          );
          if (
            !billingPackage ||
            !billingPackage.isActive ||
            billingPackage.zoneId !== computer.zoneId
          ) {
            throw badRequest("The selected package is unavailable for this computer.");
          }
          if (billingPackage.isMemberOnly && !member) {
            throw badRequest("The selected package is only available to members.");
          }
          durationMinutes = billingPackage.durationMinutes;
          initialCost = calculatePrepaidCost(billingPackage.price);
        } else if (voucherCode) {
          voucher = await Voucher.findOne({
            where: { voucherCode },
            ...lockOptions(transaction)
          });
          if (!voucher || voucher.status !== "TERSEDIA") {
            throw conflict("The voucher is invalid or has already been used.");
          }
          billingPackage = await BillingPackage.findByPk(voucher.packageId, lockOptions(transaction));
          if (
            !billingPackage ||
            !billingPackage.isActive ||
            billingPackage.isMemberOnly ||
            billingPackage.zoneId !== computer.zoneId
          ) {
            throw badRequest("The voucher package is unavailable for this computer.");
          }
          durationMinutes = voucher.durationMinutes;
          initialCost = calculatePrepaidCost(voucher.price);
        }

        if (input.billingType === "MEMBER_BALANCE") {
          if (Number(member.balance) <= 0 && member.remainingMinutes <= 0) {
            throw conflict("The member has no balance or remaining minutes.");
          }
        }

        const now = new Date();
        let session;
        for (let attempt = 0; attempt < 8; attempt += 1) {
          const candidate = generateSessionNumber(now);
          const exists = await BillingSession.findOne({
            where: { sessionNumber: candidate },
            attributes: ["id"],
            transaction
          });
          if (!exists) {
            try {
              session = await BillingSession.create(
                {
                  sessionNumber: candidate,
                  computerId: computer.id,
                  memberId: member ? member.id : null,
                  voucherId: voucher ? voucher.id : null,
                  packageId: billingPackage ? billingPackage.id : null,
                  operatorId: parseId(user.id, "userId"),
                  billingType: input.billingType,
                  startTime: now,
                  durationMinutes,
                  totalBillingCost: initialCost,
                  status: "AKTIF"
                },
                { transaction }
              );
              break;
            } catch (error) {
              if (error.name !== "SequelizeUniqueConstraintError" || attempt === 7) {
                throw error;
              }
            }
          }
        }
        if (!session) {
          throw conflict("Unable to generate a unique session number. Please retry.");
        }
        if (voucher) {
          await voucher.update({ status: "TERPAKAI", usedAt: now }, { transaction });
        }
        await computer.update({ status: "DIGUNAKAN" }, { transaction });
        if (input.billingType === "PRABAYAR" && !voucher) {
          await createPayment(
            {
              shiftId: shift.id,
              billingSessionId: session.id,
              paymentType: "BILLING",
              paymentMethod: input.paymentMethod || "TUNAI",
              amount: initialCost
            },
            transaction
          );
        }
        return session.id;
      });
      return loadSession(sessionId);
    },
    extendSession: async (_parent, { sessionId, extraMinutes, packageId }, { user }) => {
      requireBillingStaff(user);
      const id = parseId(sessionId, "sessionId");
      const minutes = validatePositiveInteger(extraMinutes, "extraMinutes");
      const billingPackageId = packageId === undefined || packageId === null
        ? null
        : parseId(packageId, "packageId");
      const updatedId = await sequelize.transaction(async (transaction) => {
        const session = await getLockedSession(id, transaction);
        const computer = await getLockedComputer(session.computerId, transaction);
        const zone = await Zone.findByPk(computer.zoneId, lockOptions(transaction));
        if (!zone || !zone.isActive) throw conflict("The computer's zone is unavailable.");

        let billingPackage = null;
        let addedMinutes = minutes;
        let additionalCost;
        if (billingPackageId) {
          billingPackage = await BillingPackage.findByPk(billingPackageId, lockOptions(transaction));
          if (
            !billingPackage ||
            !billingPackage.isActive ||
            billingPackage.zoneId !== computer.zoneId
          ) {
            throw badRequest("The selected package is unavailable for this computer.");
          }
          if (billingPackage.isMemberOnly && !session.memberId) {
            throw badRequest("The selected package is only available to members.");
          }
          addedMinutes = billingPackage.durationMinutes;
          additionalCost = calculatePrepaidCost(billingPackage.price);
        } else {
          additionalCost = calculatePrepaidCost((Number(zone.hourlyRate) / 60) * addedMinutes);
        }

        if (session.billingType === "MEMBER_BALANCE") {
          const member = await getLockedMember(session.memberId, transaction);
          await debitMember(member, additionalCost, Number(zone.hourlyRate), transaction);
        } else {
          const shift = await findActiveShift(parseId(user.id, "userId"), transaction);
          await createPayment(
            {
              shiftId: shift.id,
              billingSessionId: session.id,
              paymentType: "BILLING",
              paymentMethod: "TUNAI",
              amount: additionalCost
            },
            transaction
          );
        }
        await SessionExtension.create(
          {
            billingSessionId: session.id,
            packageId: billingPackage ? billingPackage.id : null,
            addedMinutes,
            additionalCost
          },
          { transaction }
        );
        await session.update(
          {
            durationMinutes: session.durationMinutes + addedMinutes,
            totalBillingCost: roundMoney(Number(session.totalBillingCost) + additionalCost)
          },
          { transaction }
        );
        return session.id;
      });
      return loadSession(updatedId);
    },
    moveSessionPc: async (_parent, { sessionId, targetComputerId }, { user }) => {
      requireBillingStaff(user);
      const sessionIdValue = parseId(sessionId, "sessionId");
      const targetId = parseId(targetComputerId, "targetComputerId");
      if (sessionIdValue === targetId) {
        throw badRequest("The target computer must be different from the current computer.");
      }
      await sequelize.transaction(async (transaction) => {
        const session = await getLockedSession(sessionIdValue, transaction);
        const computerIds = [session.computerId, targetId].sort((a, b) => a - b);
        const computers = [];
        for (const id of computerIds) computers.push(await getLockedComputer(id, transaction));
        const currentComputer = computers.find((computer) => computer.id === session.computerId);
        const targetComputer = computers.find((computer) => computer.id === targetId);
        if (currentComputer.status !== "DIGUNAKAN") {
          throw conflict("The current computer is not marked as in use.");
        }
        if (targetComputer.status !== "TERSEDIA") {
          throw conflict("The target computer is not available.");
        }
        await currentComputer.update({ status: "TERSEDIA" }, { transaction });
        await targetComputer.update({ status: "DIGUNAKAN" }, { transaction });
        await session.update({ computerId: targetComputer.id }, { transaction });
      });
      return loadSession(sessionIdValue);
    },
    stopSession: async (_parent, { sessionId, paymentMethod }, { user }) => {
      requireBillingStaff(user);
      const id = parseId(sessionId, "sessionId");
      await sequelize.transaction(async (transaction) => {
        const session = await getLockedSession(id, transaction);
        const computer = await getLockedComputer(session.computerId, transaction);
        if (computer.status !== "DIGUNAKAN") {
          throw conflict("The session's computer is not marked as in use.");
        }
        const now = new Date();
        const elapsedMinutes = calculateElapsedMinutes(session.startTime, now);
        let durationMinutes = Math.ceil(elapsedMinutes);
        let totalCost = Number(session.totalBillingCost);
        let finalBillingCharge = 0;
        const extensions = await SessionExtension.findAll({
          where: { billingSessionId: session.id },
          attributes: ["addedMinutes", "extendedAt"],
          order: [["extendedAt", "ASC"]],
          transaction
        });

        if (session.billingType === "OPEN_BILLING") {
          const uncoveredMinutes = calculateUncoveredMinutes(
            session.startTime,
            now,
            extensions
          );
          const zone = await Zone.findByPk(computer.zoneId, lockOptions(transaction));
          if (!zone) throw notFound("Zone");
          finalBillingCharge = calculateOpenBilling(
            now.getTime() - uncoveredMinutes * 60000,
            now,
            Number(zone.hourlyRate)
          );
          totalCost = roundMoney(totalCost + finalBillingCharge);
        } else if (session.billingType === "MEMBER_BALANCE") {
          const member = await getLockedMember(session.memberId, transaction);
          const zone = await Zone.findByPk(computer.zoneId, lockOptions(transaction));
          if (!zone) throw notFound("Zone");
          const billableMinutes = calculateUncoveredMinutes(
            session.startTime,
            now,
            extensions
          );
          durationMinutes = Math.ceil(elapsedMinutes);
          const grossCost = calculatePrepaidCost((Number(zone.hourlyRate) / 60) * billableMinutes);
          await debitMember(member, grossCost, Number(zone.hourlyRate), transaction);
          totalCost = roundMoney(totalCost + grossCost);
        } else {
          const overtimeMinutes = Math.max(0, elapsedMinutes - session.durationMinutes);
          if (overtimeMinutes > 0) {
            const zone = await Zone.findByPk(computer.zoneId, lockOptions(transaction));
            if (!zone) throw notFound("Zone");
            finalBillingCharge = calculatePrepaidCost(
              (Number(zone.hourlyRate) / 60) * overtimeMinutes
            );
            totalCost = roundMoney(totalCost + finalBillingCharge);
          }
        }

        const unpaidOrders = await FbOrder.findAll({
          where: { billingSessionId: session.id, paymentStatus: "BELUM_BAYAR" },
          attributes: ["id", "totalAmount"],
          transaction,
          lock: transaction.LOCK.UPDATE
        });
        const foodTotal = roundMoney(
          unpaidOrders.reduce((total, order) => total + Number(order.totalAmount), 0)
        );
        const outstandingAmount = roundMoney(finalBillingCharge + foodTotal);
        if (outstandingAmount > 0) {
          const shift = await findActiveShift(parseId(user.id, "userId"), transaction);
          await createPayment(
            {
              shiftId: shift.id,
              billingSessionId: session.id,
              paymentType: unpaidOrders.length ? "GABUNGAN" : "BILLING",
              paymentMethod: paymentMethod || "TUNAI",
              amount: outstandingAmount
            },
            transaction
          );
        }
        if (unpaidOrders.length) {
          await FbOrder.update(
            { paymentStatus: "LUNAS" },
            {
              where: { id: { [Op.in]: unpaidOrders.map((order) => order.id) } },
              transaction
            }
          );
        }

        if (session.memberId) {
          const member = await getLockedMember(session.memberId, transaction);
          const points = Math.floor(totalCost / 1000);
          if (member && points > 0) await member.increment({ points }, { transaction });
        }

        await session.update(
          {
            endTime: now,
            durationMinutes,
            totalBillingCost: roundMoney(totalCost),
            status: "SELESAI"
          },
          { transaction }
        );
        await computer.update({ status: "TERSEDIA" }, { transaction });
      });
      return loadSession(id);
    }
  }
};

module.exports = resolvers;
