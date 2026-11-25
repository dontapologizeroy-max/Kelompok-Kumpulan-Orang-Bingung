module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    "Zone",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      code: { type: DataTypes.STRING(20), allowNull: false, unique: true },
      name: { type: DataTypes.STRING(100), allowNull: false },
      hourlyRate: { type: DataTypes.DECIMAL(15, 2), allowNull: false, field: "hourly_rate" },
      description: DataTypes.TEXT,
      isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: "is_active" },
      createdAt: { type: DataTypes.DATE, field: "created_at", defaultValue: DataTypes.NOW }
    },
    { tableName: "zones", timestamps: false }
  );
