module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    "Member",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      memberCode: { type: DataTypes.STRING(30), allowNull: false, unique: true, field: "member_code" },
      username: { type: DataTypes.STRING(100), allowNull: false, unique: true },
      password: { type: DataTypes.STRING(255), allowNull: false },
      fullName: { type: DataTypes.STRING(150), allowNull: false, field: "full_name" },
      phone: DataTypes.STRING(30),
      email: DataTypes.STRING(150),
      balance: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
      remainingMinutes: { type: DataTypes.INTEGER, defaultValue: 0, field: "remaining_minutes" },
      points: { type: DataTypes.INTEGER, defaultValue: 0 },
      isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: "is_active" },
      createdAt: { type: DataTypes.DATE, field: "created_at" },
      updatedAt: { type: DataTypes.DATE, field: "updated_at" }
    },
    { tableName: "members" }
  );
