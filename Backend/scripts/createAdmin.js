require("dotenv").config();

const bcrypt = require("bcrypt");
const sequelize = require("../src/config/database");
const { Role, User } = require("../src/models");

async function createAdmin() {
  const { ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_FULL_NAME } = process.env;
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD || !ADMIN_FULL_NAME) {
    throw new Error(
      "Set ADMIN_USERNAME, ADMIN_PASSWORD, and ADMIN_FULL_NAME before creating the first admin."
    );
  }
  if (ADMIN_PASSWORD.length < 8) {
    throw new Error("ADMIN_PASSWORD must contain at least 8 characters.");
  }
  if (!ADMIN_USERNAME.trim() || !ADMIN_FULL_NAME.trim()) {
    throw new Error("ADMIN_USERNAME and ADMIN_FULL_NAME cannot be empty.");
  }

  await sequelize.authenticate();
  const adminRole = await Role.findOne({ where: { name: "ADMIN" } });
  if (!adminRole) {
    throw new Error("The ADMIN role is missing. Run database/schema.sql first.");
  }
  if (await User.count({ where: { roleId: adminRole.id } })) {
    throw new Error("An ADMIN account already exists; refusing to create another bootstrap account.");
  }

  await User.create({
    roleId: adminRole.id,
    username: ADMIN_USERNAME.trim(),
    password: await bcrypt.hash(ADMIN_PASSWORD, 12),
    fullName: ADMIN_FULL_NAME.trim(),
    isActive: true
  });
  console.log(`Created initial administrator "${ADMIN_USERNAME.trim()}".`);
}

createAdmin()
  .catch((error) => {
    console.error("Failed to create initial administrator:", error);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
