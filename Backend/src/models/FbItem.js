module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    "FbItem",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      categoryId: { type: DataTypes.INTEGER, allowNull: false, field: "category_id" },
      code: { type: DataTypes.STRING(30), allowNull: false, unique: true },
      name: { type: DataTypes.STRING(150), allowNull: false },
      stock: { type: DataTypes.INTEGER, defaultValue: 0 },
      minimumStock: { type: DataTypes.INTEGER, defaultValue: 5, field: "minimum_stock" },
      price: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
      isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: "is_active" },
      createdAt: { type: DataTypes.DATE, field: "created_at", defaultValue: DataTypes.NOW }
    },
    { tableName: "fb_items", timestamps: false }
  );
