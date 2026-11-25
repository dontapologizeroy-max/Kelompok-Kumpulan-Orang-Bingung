const authResolvers = require("./auth.resolver");
const memberResolvers = require("./member.resolver");
const computerResolvers = require("./computer.resolver");
const billingResolvers = require("./billing.resolver");
const fbResolvers = require("./fb.resolver");
const maintenanceResolvers = require("./maintenance.resolver");
const shiftReportResolvers = require("./shiftReport.resolver");

const modules = [
  authResolvers,
  memberResolvers,
  computerResolvers,
  billingResolvers,
  fbResolvers,
  maintenanceResolvers,
  shiftReportResolvers
];

module.exports = modules.reduce((merged, moduleResolvers) => {
  for (const [typeName, fields] of Object.entries(moduleResolvers)) {
    merged[typeName] = { ...merged[typeName], ...fields };
  }
  return merged;
}, {});
