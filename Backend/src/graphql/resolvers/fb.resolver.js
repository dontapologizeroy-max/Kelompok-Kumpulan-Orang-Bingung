const { randomUUID } = require("node:crypto");
const { Op } = require("sequelize");
const {
  FbCategory,
  FbItem,
  FbOrder,
  FbOrderDetail,
  BillingSession,
  Computer,
  OperatorShift,
  Payment,
  sequelize
} = require("../../models");
const { requireRole } = require("../../middlewares/roleGuard");
const { badRequest, conflict, notFound, parseId } = require("../utils");

const orderIncludes = [
  {
    model: FbOrderDetail,
    as: "details",
    include: [{ model: FbItem, as: "item", include: [{ model: FbCategory, as: "category" }] }]
  }
];

function amountToCents(value) {
  return Math.round(Number(value) * 100);
}

function paymentNumber() {
  return `PAY-${randomUUID().replace(/-/g, "").slice(0, 24).toUpperCase()}`;
}

async function findOpenShift(userId, transaction) {
  const shift = await OperatorShift.findOne({
    where: { userId, status: "BUKA" },
    order: [["startTime", "DESC"]],
    transaction,
    lock: transaction.LOCK.UPDATE
  });
  if (!shift) {
    throw badRequest("Open a cashier shift before recording a payment.");
  }
  return shift;
}

async function loadOrder(id) {
  return FbOrder.findByPk(id, { include: orderIncludes });
}

const resolvers = {
  FbCategory: {
    items: (category) => category.items || FbItem.findAll({ where: { categoryId: category.id } })
  },
  FbItem: {
    category: (item) => item.category || FbCategory.findByPk(item.categoryId)
  },
  Query: {
    fbCategories: async (_parent, _args, { user }) => {
      requireRole(user, "ADMIN", "OPERATOR", "OWNER");
      return FbCategory.findAll({
        include: [{ model: FbItem, as: "items" }],
        order: [["name", "ASC"]]
      });
    },
    fbItems: async (_parent, { categoryId, lowStockOnly }, { user }) => {
      requireRole(user, "ADMIN", "OPERATOR", "OWNER");
      const where = {};
      if (categoryId !== undefined && categoryId !== null) {
        where.categoryId = parseId(categoryId, "categoryId");
      }
      if (lowStockOnly) {
        where.stock = { [Op.lte]: sequelize.col("minimum_stock") };
      }
      return FbItem.findAll({
        where,
        include: [{ model: FbCategory, as: "category" }],
        order: [["name", "ASC"]]
      });
    },
    fbOrders: async (_parent, { status, sessionId }, { user }) => {
      requireRole(user, "ADMIN", "OPERATOR", "OWNER");
      const where = {};
      if (status) where.paymentStatus = status;
      if (sessionId !== undefined && sessionId !== null) {
        where.billingSessionId = parseId(sessionId, "sessionId");
      }
      return FbOrder.findAll({ include: orderIncludes, where, order: [["orderDate", "DESC"]] });
    }
  },
  Mutation: {
    createFbCategory: async (_parent, { name, description }, { user }) => {
      requireRole(user, "ADMIN", "OPERATOR");
      if (typeof name !== "string" || !name.trim()) throw badRequest("Category name cannot be empty.");
      return FbCategory.create({ name: name.trim(), description: description?.trim() || null });
    },
    updateFbCategory: async (_parent, { id, input }, { user }) => {
      requireRole(user, "ADMIN", "OPERATOR");
      const category = await FbCategory.findByPk(parseId(id));
      if (!category) throw notFound("F&B category");
      const changes = {};
      if (input.name !== undefined) {
        if (typeof input.name !== "string" || !input.name.trim()) {
          throw badRequest("Category name cannot be empty.");
        }
        changes.name = input.name.trim();
      }
      if (input.description !== undefined) changes.description = input.description?.trim() || null;
      if (Object.keys(changes).length === 0) throw badRequest("Provide at least one category field to update.");
      await category.update(changes);
      return category;
    },
    deleteFbCategory: async (_parent, { id }, { user }) => {
      requireRole(user, "ADMIN");
      const categoryId = parseId(id);
      const category = await FbCategory.findByPk(categoryId);
      if (!category) throw notFound("F&B category");
      if (await FbItem.count({ where: { categoryId } })) {
        throw conflict("A category with menu items cannot be deleted.");
      }
      await category.destroy();
      return true;
    },
    createFbItem: async (_parent, { input }, { user }) => {
      requireRole(user, "ADMIN", "OPERATOR");
      const categoryId = parseId(input.categoryId, "categoryId");
      const category = await FbCategory.findByPk(categoryId);
      if (!category) throw notFound("F&B category");
      if (!input.code.trim() || !input.name.trim()) throw badRequest("Item code and name are required.");
      if (!Number.isFinite(Number(input.price)) || Number(input.price) < 0) {
        throw badRequest("Item price must be a non-negative number.");
      }
      const stock = input.stock ?? 0;
      const minimumStock = input.minimumStock ?? 5;
      if (!Number.isInteger(stock) || stock < 0 || !Number.isInteger(minimumStock) || minimumStock < 0) {
        throw badRequest("Stock values must be non-negative integers.");
      }
      return FbItem.create({
        categoryId,
        code: input.code.trim().toUpperCase(),
        name: input.name.trim(),
        stock,
        minimumStock,
        price: input.price,
        isActive: input.isActive ?? true
      });
    },
    updateFbItem: async (_parent, { id, input }, { user }) => {
      requireRole(user, "ADMIN", "OPERATOR");
      const item = await FbItem.findByPk(parseId(id));
      if (!item) throw notFound("F&B item");
      const changes = {};
      if (input.categoryId !== undefined) {
        const categoryId = parseId(input.categoryId, "categoryId");
        if (!(await FbCategory.findByPk(categoryId))) throw notFound("F&B category");
        changes.categoryId = categoryId;
      }
      if (input.code !== undefined) {
        if (typeof input.code !== "string" || !input.code.trim()) throw badRequest("Item code cannot be empty.");
        changes.code = input.code.trim().toUpperCase();
      }
      if (input.name !== undefined) {
        if (typeof input.name !== "string" || !input.name.trim()) throw badRequest("Item name cannot be empty.");
        changes.name = input.name.trim();
      }
      for (const field of ["stock", "minimumStock"]) {
        if (input[field] !== undefined) {
          if (!Number.isInteger(input[field]) || input[field] < 0) {
            throw badRequest(`${field} must be a non-negative integer.`);
          }
          changes[field] = input[field];
        }
      }
      if (input.price !== undefined) {
        if (!Number.isFinite(Number(input.price)) || Number(input.price) < 0) {
          throw badRequest("Item price must be a non-negative number.");
        }
        changes.price = input.price;
      }
      if (input.isActive !== undefined) changes.isActive = input.isActive;
      if (Object.keys(changes).length === 0) throw badRequest("Provide at least one item field to update.");
      await item.update(changes);
      return item;
    },
    deleteFbItem: async (_parent, { id }, { user }) => {
      requireRole(user, "ADMIN");
      const item = await FbItem.findByPk(parseId(id));
      if (!item) throw notFound("F&B item");
      if (await FbOrderDetail.count({ where: { fbItemId: item.id } })) {
        throw conflict("An item in order history cannot be deleted.");
      }
      await item.destroy();
      return true;
    },
    updateFbStock: async (_parent, { itemId, adjustment }, { user }) => {
      requireRole(user, "ADMIN", "OPERATOR");
      if (!Number.isInteger(adjustment) || adjustment === 0) {
        throw badRequest("Stock adjustment must be a non-zero integer.");
      }
      return sequelize.transaction(async (transaction) => {
        const item = await FbItem.findByPk(parseId(itemId, "itemId"), {
          transaction,
          lock: transaction.LOCK.UPDATE
        });
        if (!item) throw notFound("F&B item");
        const newStock = item.stock + adjustment;
        if (newStock < 0) throw conflict("Stock cannot become negative.");
        await item.update({ stock: newStock }, { transaction });
        return item;
      });
    },
    createFbOrder: async (_parent, { input }, { user }) => {
      requireRole(user, "ADMIN", "OPERATOR");
      if (!Array.isArray(input.items) || input.items.length === 0) {
        throw badRequest("An order must contain at least one item.");
      }
      const quantities = new Map();
      for (const line of input.items) {
        const itemId = parseId(line.fbItemId, "fbItemId");
        if (!Number.isInteger(line.quantity) || line.quantity < 1) {
          throw badRequest("Order quantities must be positive integers.");
        }
        quantities.set(itemId, (quantities.get(itemId) || 0) + line.quantity);
      }

      const orderId = await sequelize.transaction(async (transaction) => {
        let billingSessionId = null;
        let computerId = input.computerId ? parseId(input.computerId, "computerId") : null;
        if (input.paymentMode === "BELUM_BAYAR") {
          if (!input.billingSessionId) {
            throw badRequest("An unpaid order must be attached to an active billing session.");
          }
          const session = await BillingSession.findByPk(parseId(input.billingSessionId, "billingSessionId"), {
            transaction,
            lock: transaction.LOCK.UPDATE
          });
          if (!session || session.status !== "AKTIF") throw conflict("The billing session is not active.");
          billingSessionId = session.id;
          if (computerId && computerId !== session.computerId) {
            throw badRequest("The selected computer does not match the billing session.");
          }
          computerId = session.computerId;
        } else if (input.billingSessionId) {
          throw badRequest("Directly paid orders cannot be attached to a billing session.");
        }

        const orderLines = [];
        let totalCents = 0;
        for (const [itemId, quantity] of [...quantities.entries()].sort((a, b) => a[0] - b[0])) {
          const item = await FbItem.findByPk(itemId, { transaction, lock: transaction.LOCK.UPDATE });
          if (!item || !item.isActive) throw notFound(`Active F&B item ${itemId}`);
          if (item.stock < quantity) throw conflict(`Insufficient stock for ${item.name}.`);
          const unitPriceCents = amountToCents(item.price);
          const subtotalCents = unitPriceCents * quantity;
          totalCents += subtotalCents;
          orderLines.push({ item, quantity, unitPriceCents, subtotalCents });
        }

        if (computerId && !billingSessionId) {
          const computer = await Computer.findByPk(computerId, { transaction });
          if (!computer) throw notFound("Computer");
        }
        const paid = input.paymentMode === "LUNAS";
        const order = await FbOrder.create({
          orderNumber: `FNB-${randomUUID().replace(/-/g, "").slice(0, 20).toUpperCase()}`,
          billingSessionId,
          computerId,
          operatorId: user.id,
          totalAmount: totalCents / 100,
          paymentStatus: paid ? "LUNAS" : "BELUM_BAYAR"
        }, { transaction });

        for (const line of orderLines) {
          await line.item.update({ stock: line.item.stock - line.quantity }, { transaction });
          await FbOrderDetail.create({
            fbOrderId: order.id,
            fbItemId: line.item.id,
            quantity: line.quantity,
            unitPrice: line.unitPriceCents / 100,
            subtotal: line.subtotalCents / 100
          }, { transaction });
        }

        if (paid) {
          const shift = await findOpenShift(user.id, transaction);
          await Payment.create({
            paymentNumber: paymentNumber(),
            shiftId: shift.id,
            fbOrderId: order.id,
            paymentType: "FNB",
            paymentMethod: input.paymentMethod || "TUNAI",
            amount: totalCents / 100
          }, { transaction });
        }
        return order.id;
      });
      return loadOrder(orderId);
    },
    payFbOrder: async (_parent, { orderId, paymentMethod }, { user }) => {
      requireRole(user, "ADMIN", "OPERATOR");
      const id = parseId(orderId, "orderId");
      await sequelize.transaction(async (transaction) => {
        const order = await FbOrder.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
        if (!order) throw notFound("F&B order");
        if (order.paymentStatus === "LUNAS") throw conflict("This order has already been paid.");
        const shift = await findOpenShift(user.id, transaction);
        await Payment.create({
          paymentNumber: paymentNumber(),
          shiftId: shift.id,
          billingSessionId: order.billingSessionId,
          fbOrderId: order.id,
          paymentType: "FNB",
          paymentMethod,
          amount: order.totalAmount
        }, { transaction });
        await order.update({ paymentStatus: "LUNAS" }, { transaction });
      });
      return loadOrder(id);
    }
  }
};

module.exports = resolvers;