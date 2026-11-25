module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    "Payment",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      paymentNumber: { type: DataTypes.STRING(50), allowNull: false, unique: true, field: "payment_number" },
      shiftId: { type: DataTypes.INTEGER, allowNull: false, field: "shift_id" },
      billingSessionId: { type: DataTypes.INTEGER, field: "billing_session_id" },
      fbOrderId: { type: DataTypes.INTEGER, field: "fb_order_id" },
      memberId: { type: DataTypes.INTEGER, field: "member_id" },
      paymentType: {
        type: DataTypes.ENUM("BILLING", "FNB", "TOPUP_MEMBER", "GABUNGAN"),
        allowNull: false,
        field: "payment_type"
      },
      paymentMethod: {
        type: DataTypes.ENUM("TUNAI", "QRIS", "TRANSFER"),
        defaultValue: "TUNAI",
        field: "payment_method"
      },
      amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
      paidAt: { type: DataTypes.DATE, field: "paid_at", defaultValue: DataTypes.NOW }
    },
    { tableName: "payments", timestamps: false }
  );
