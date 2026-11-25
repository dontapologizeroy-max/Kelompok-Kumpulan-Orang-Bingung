module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    "Voucher",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      packageId: { type: DataTypes.INTEGER, allowNull: false, field: "package_id" },
      createdBy: { type: DataTypes.INTEGER, allowNull: false, field: "created_by" },
      voucherCode: { type: DataTypes.STRING(30), allowNull: false, unique: true, field: "voucher_code" },
      durationMinutes: { type: DataTypes.INTEGER, allowNull: false, field: "duration_minutes" },
      price: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
      status: {
        type: DataTypes.ENUM("TERSEDIA", "TERPAKAI", "KADALUARSA"),
        defaultValue: "TERSEDIA"
      },
      usedAt: { type: DataTypes.DATE, field: "used_at" },
      createdAt: { type: DataTypes.DATE, field: "created_at", defaultValue: DataTypes.NOW }
    },
    { tableName: "vouchers", timestamps: false }
  );
