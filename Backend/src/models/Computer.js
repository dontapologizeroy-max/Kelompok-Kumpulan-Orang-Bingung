module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    "Computer",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      zoneId: { type: DataTypes.INTEGER, allowNull: false, field: "zone_id" },
      pcCode: { type: DataTypes.STRING(20), allowNull: false, unique: true, field: "pc_code" },
      pcName: { type: DataTypes.STRING(100), allowNull: false, field: "pc_name" },
      ipAddress: { type: DataTypes.STRING(45), field: "ip_address" },
      macAddress: { type: DataTypes.STRING(50), field: "mac_address" },
      specifications: DataTypes.TEXT,
      status: {
        type: DataTypes.ENUM("TERSEDIA", "DIGUNAKAN", "MAINTENANCE", "OFFLINE"),
        defaultValue: "TERSEDIA"
      },
      createdAt: { type: DataTypes.DATE, field: "created_at" },
      updatedAt: { type: DataTypes.DATE, field: "updated_at" }
    },
    { tableName: "computers" }
  );
