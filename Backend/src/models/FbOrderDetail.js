module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    "FbOrderDetail",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      fbOrderId: { type: DataTypes.INTEGER, allowNull: false, field: "fb_order_id" },
      fbItemId: { type: DataTypes.INTEGER, allowNull: false, field: "fb_item_id" },
      quantity: { type: DataTypes.INTEGER, allowNull: false },
      unitPrice: { type: DataTypes.DECIMAL(15, 2), allowNull: false, field: "unit_price" },
      subtotal: { type: DataTypes.DECIMAL(15, 2), allowNull: false }
    },
    { tableName: "fb_order_details", timestamps: false }
  );
