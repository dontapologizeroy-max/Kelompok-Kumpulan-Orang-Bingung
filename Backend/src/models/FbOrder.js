module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    "FbOrder",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      orderNumber: { type: DataTypes.STRING(50), allowNull: false, unique: true, field: "order_number" },
      billingSessionId: { type: DataTypes.INTEGER, field: "billing_session_id" },
      computerId: { type: DataTypes.INTEGER, field: "computer_id" },
      operatorId: { type: DataTypes.INTEGER, allowNull: false, field: "operator_id" },
      orderDate: { type: DataTypes.DATE, field: "order_date", defaultValue: DataTypes.NOW },
      totalAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: "total_amount" },
      paymentStatus: {
        type: DataTypes.ENUM("BELUM_BAYAR", "LUNAS"),
        defaultValue: "BELUM_BAYAR",
        field: "payment_status"
      }
    },
    { tableName: "fb_orders", timestamps: false }
  );
