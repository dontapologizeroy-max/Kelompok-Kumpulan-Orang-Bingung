const { randomInt } = require("crypto");

const CODE_CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function randomCode(length) {
  let code = "";
  for (let index = 0; index < length; index += 1) {
    code += CODE_CHARACTERS[randomInt(CODE_CHARACTERS.length)];
  }
  return code;
}

function dateStamp(date = new Date()) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new TypeError("date must be a valid Date.");
  }
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

function generateVoucherCode() {
  return `VCH-${randomCode(6)}`;
}

function generateSessionNumber(date = new Date()) {
  return `SES-${dateStamp(date)}-${randomCode(4)}`;
}

function generatePaymentNumber(date = new Date()) {
  return `PAY-${dateStamp(date)}-${randomCode(4)}`;
}

module.exports = {
  generateVoucherCode,
  generateSessionNumber,
  generatePaymentNumber
};
