module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    "SessionExtension",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      billingSessionId: { type: DataTypes.INTEGER, allowNull: false, field: "billing_session_id" },
      packageId: { type: DataTypes.INTEGER, field: "package_id" },
      addedMinutes: { type: DataTypes.INTEGER, allowNull: false, field: "added_minutes" },
      additionalCost: { type: DataTypes.DECIMAL(15, 2), allowNull: false, field: "additional_cost" },
      extendedAt: { type: DataTypes.DATE, field: "extended_at", defaultValue: DataTypes.NOW }
    },
    { tableName: "session_extensions", timestamps: false }
  );
