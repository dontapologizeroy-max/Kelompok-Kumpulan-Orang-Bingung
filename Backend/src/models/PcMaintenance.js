module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    "PcMaintenance",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      computerId: { type: DataTypes.INTEGER, allowNull: false, field: "computer_id" },
      reportedBy: { type: DataTypes.INTEGER, allowNull: false, field: "reported_by" },
      technicianId: { type: DataTypes.INTEGER, field: "technician_id" },
      issueDescription: { type: DataTypes.TEXT, allowNull: false, field: "issue_description" },
      actionTaken: { type: DataTypes.TEXT, field: "action_taken" },
      cost: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
      status: {
        type: DataTypes.ENUM("DILAPORKAN", "DIPERBAIKI", "SELESAI"),
        defaultValue: "DILAPORKAN"
      },
      reportedAt: { type: DataTypes.DATE, field: "reported_at", defaultValue: DataTypes.NOW },
      resolvedAt: { type: DataTypes.DATE, field: "resolved_at" }
    },
    { tableName: "pc_maintenances", timestamps: false }
  );
