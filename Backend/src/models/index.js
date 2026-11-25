const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const models = {
  Role: require("./Role")(sequelize, DataTypes),
  User: require("./User")(sequelize, DataTypes),
  Member: require("./Member")(sequelize, DataTypes),
  Zone: require("./Zone")(sequelize, DataTypes),
  Computer: require("./Computer")(sequelize, DataTypes),
  BillingPackage: require("./BillingPackage")(sequelize, DataTypes),
  Voucher: require("./Voucher")(sequelize, DataTypes),
  BillingSession: require("./BillingSession")(sequelize, DataTypes),
  SessionExtension: require("./SessionExtension")(sequelize, DataTypes),
  FbCategory: require("./FbCategory")(sequelize, DataTypes),
  FbItem: require("./FbItem")(sequelize, DataTypes),
  FbOrder: require("./FbOrder")(sequelize, DataTypes),
  FbOrderDetail: require("./FbOrderDetail")(sequelize, DataTypes),
  PcMaintenance: require("./PcMaintenance")(sequelize, DataTypes),
  OperatorShift: require("./OperatorShift")(sequelize, DataTypes),
  Payment: require("./Payment")(sequelize, DataTypes)
};

const {
  Role,
  User,
  Member,
  Zone,
  Computer,
  BillingPackage,
  Voucher,
  BillingSession,
  SessionExtension,
  FbCategory,
  FbItem,
  FbOrder,
  FbOrderDetail,
  PcMaintenance,
  OperatorShift,
  Payment
} = models;

Role.hasMany(User, { foreignKey: "roleId", as: "users" });
User.belongsTo(Role, { foreignKey: "roleId", as: "role" });
Zone.hasMany(Computer, { foreignKey: "zoneId", as: "computers" });
Computer.belongsTo(Zone, { foreignKey: "zoneId", as: "zone" });
Zone.hasMany(BillingPackage, { foreignKey: "zoneId", as: "billingPackages" });
BillingPackage.belongsTo(Zone, { foreignKey: "zoneId", as: "zone" });

User.hasMany(Voucher, { foreignKey: "createdBy", as: "createdVouchers" });
Voucher.belongsTo(User, { foreignKey: "createdBy", as: "creator" });
BillingPackage.hasMany(Voucher, { foreignKey: "packageId", as: "vouchers" });
Voucher.belongsTo(BillingPackage, { foreignKey: "packageId", as: "package" });

Computer.hasMany(BillingSession, { foreignKey: "computerId", as: "sessions" });
BillingSession.belongsTo(Computer, { foreignKey: "computerId", as: "computer" });
Member.hasMany(BillingSession, { foreignKey: "memberId", as: "sessions" });
BillingSession.belongsTo(Member, { foreignKey: "memberId", as: "member" });
Voucher.hasMany(BillingSession, { foreignKey: "voucherId", as: "sessions" });
BillingSession.belongsTo(Voucher, { foreignKey: "voucherId", as: "voucher" });
BillingPackage.hasMany(BillingSession, { foreignKey: "packageId", as: "sessions" });
BillingSession.belongsTo(BillingPackage, { foreignKey: "packageId", as: "package" });
User.hasMany(BillingSession, { foreignKey: "operatorId", as: "operatedSessions" });
BillingSession.belongsTo(User, { foreignKey: "operatorId", as: "operator" });
BillingSession.hasMany(SessionExtension, { foreignKey: "billingSessionId", as: "extensions" });
SessionExtension.belongsTo(BillingSession, { foreignKey: "billingSessionId", as: "session" });
BillingPackage.hasMany(SessionExtension, { foreignKey: "packageId", as: "extensions" });
SessionExtension.belongsTo(BillingPackage, { foreignKey: "packageId", as: "package" });

FbCategory.hasMany(FbItem, { foreignKey: "categoryId", as: "items" });
FbItem.belongsTo(FbCategory, { foreignKey: "categoryId", as: "category" });
BillingSession.hasMany(FbOrder, { foreignKey: "billingSessionId", as: "fbOrders" });
FbOrder.belongsTo(BillingSession, { foreignKey: "billingSessionId", as: "session" });
Computer.hasMany(FbOrder, { foreignKey: "computerId", as: "fbOrders" });
FbOrder.belongsTo(Computer, { foreignKey: "computerId", as: "computer" });
User.hasMany(FbOrder, { foreignKey: "operatorId", as: "fbOrders" });
FbOrder.belongsTo(User, { foreignKey: "operatorId", as: "operator" });
FbOrder.hasMany(FbOrderDetail, { foreignKey: "fbOrderId", as: "details" });
FbOrderDetail.belongsTo(FbOrder, { foreignKey: "fbOrderId", as: "order" });
FbItem.hasMany(FbOrderDetail, { foreignKey: "fbItemId", as: "orderDetails" });
FbOrderDetail.belongsTo(FbItem, { foreignKey: "fbItemId", as: "item" });

Computer.hasMany(PcMaintenance, { foreignKey: "computerId", as: "maintenances" });
PcMaintenance.belongsTo(Computer, { foreignKey: "computerId", as: "computer" });
User.hasMany(PcMaintenance, { foreignKey: "reportedBy", as: "reportedMaintenances" });
PcMaintenance.belongsTo(User, { foreignKey: "reportedBy", as: "reporter" });
User.hasMany(PcMaintenance, { foreignKey: "technicianId", as: "assignedMaintenances" });
PcMaintenance.belongsTo(User, { foreignKey: "technicianId", as: "technician" });

User.hasMany(OperatorShift, { foreignKey: "userId", as: "shifts" });
OperatorShift.belongsTo(User, { foreignKey: "userId", as: "user" });
OperatorShift.hasMany(Payment, { foreignKey: "shiftId", as: "payments" });
Payment.belongsTo(OperatorShift, { foreignKey: "shiftId", as: "shift" });
BillingSession.hasMany(Payment, { foreignKey: "billingSessionId", as: "payments" });
Payment.belongsTo(BillingSession, { foreignKey: "billingSessionId", as: "session" });
FbOrder.hasMany(Payment, { foreignKey: "fbOrderId", as: "payments" });
Payment.belongsTo(FbOrder, { foreignKey: "fbOrderId", as: "fbOrder" });
Member.hasMany(Payment, { foreignKey: "memberId", as: "payments" });
Payment.belongsTo(Member, { foreignKey: "memberId", as: "member" });

module.exports = { ...models, sequelize };
