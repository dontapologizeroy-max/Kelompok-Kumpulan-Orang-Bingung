module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    "BillingPackage",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      zoneId: { type: DataTypes.INTEGER, allowNull: false, field: "zone_id" },
      code: { type: DataTypes.STRING(30), allowNull: false, unique: true },
      name: { type: DataTypes.STRING(100), allowNull: false },
      durationMinutes: { type: DataTypes.INTEGER, allowNull: false, field: "duration_minutes" },
      price: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
      isMemberOnly: { type: DataTypes.BOOLEAN, defaultValue: false, field: "is_member_only" },
      isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: "is_active" },
      createdAt: { type: DataTypes.DATE, field: "created_at", defaultValue: DataTypes.NOW }
    },
    { tableName: "billing_packages", timestamps: false }
  );
