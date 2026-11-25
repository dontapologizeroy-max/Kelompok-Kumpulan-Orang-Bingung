module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    "FbCategory",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
      description: DataTypes.TEXT,
      createdAt: { type: DataTypes.DATE, field: "created_at", defaultValue: DataTypes.NOW }
    },
    { tableName: "fb_categories", timestamps: false }
  );
