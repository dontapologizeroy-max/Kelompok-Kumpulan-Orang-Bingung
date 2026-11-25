module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    "OperatorShift",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      userId: { type: DataTypes.INTEGER, allowNull: false, field: "user_id" },
      startTime: { type: DataTypes.DATE, field: "start_time", defaultValue: DataTypes.NOW },
      endTime: { type: DataTypes.DATE, field: "end_time" },
      startingCash: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: "starting_cash" },
      endingCash: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: "ending_cash" },
      systemExpectedCash: {
        type: DataTypes.DECIMAL(15, 2),
        defaultValue: 0,
        field: "system_expected_cash"
      },
      notes: DataTypes.TEXT,
      status: { type: DataTypes.ENUM("BUKA", "TUTUP"), defaultValue: "BUKA" }
    },
    { tableName: "operator_shifts", timestamps: false }
  );
