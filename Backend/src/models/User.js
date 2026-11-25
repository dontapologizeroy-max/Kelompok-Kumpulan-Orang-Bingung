module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    "User",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      roleId: { type: DataTypes.INTEGER, allowNull: false, field: "role_id" },
      username: { type: DataTypes.STRING(100), allowNull: false, unique: true },
      password: { type: DataTypes.STRING(255), allowNull: false },
      fullName: { type: DataTypes.STRING(150), allowNull: false, field: "full_name" },
      email: DataTypes.STRING(150),
      phone: DataTypes.STRING(30),
      isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: "is_active" },
      createdAt: { type: DataTypes.DATE, field: "created_at" },
      updatedAt: { type: DataTypes.DATE, field: "updated_at" }
    },
    { tableName: "users" }
  );
