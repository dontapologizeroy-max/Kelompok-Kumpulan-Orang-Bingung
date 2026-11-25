module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    "BillingSession",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      sessionNumber: { type: DataTypes.STRING(50), allowNull: false, unique: true, field: "session_number" },
      computerId: { type: DataTypes.INTEGER, allowNull: false, field: "computer_id" },
      memberId: { type: DataTypes.INTEGER, field: "member_id" },
      voucherId: { type: DataTypes.INTEGER, field: "voucher_id" },
      packageId: { type: DataTypes.INTEGER, field: "package_id" },
      operatorId: { type: DataTypes.INTEGER, allowNull: false, field: "operator_id" },
      billingType: {
        type: DataTypes.ENUM("PRABAYAR", "OPEN_BILLING", "MEMBER_BALANCE"),
        allowNull: false,
        field: "billing_type"
      },
      startTime: { type: DataTypes.DATE, field: "start_time", defaultValue: DataTypes.NOW },
      endTime: { type: DataTypes.DATE, field: "end_time" },
      durationMinutes: { type: DataTypes.INTEGER, defaultValue: 0, field: "duration_minutes" },
      totalBillingCost: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: "total_billing_cost" },
      status: {
        type: DataTypes.ENUM("AKTIF", "SELESAI", "DIBATALKAN"),
        defaultValue: "AKTIF"
      },
      createdAt: { type: DataTypes.DATE, field: "created_at", defaultValue: DataTypes.NOW }
    },
    { tableName: "billing_sessions", timestamps: false }
  );
