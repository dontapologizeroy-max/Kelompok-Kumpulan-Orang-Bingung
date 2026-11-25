function positiveNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new TypeError(`${label} must be a non-negative number.`);
  }
  return number;
}

function positiveRate(value) {
  const rate = positiveNumber(value, "hourlyRate");
  if (rate === 0) {
    throw new TypeError("hourlyRate must be greater than zero.");
  }
  return rate;
}

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function calculatePrepaidCost(price) {
  return roundMoney(positiveNumber(price, "price"));
}

function calculateOpenBilling(startTime, endTime, hourlyRate) {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const rate = positiveRate(hourlyRate);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    throw new TypeError("startTime and endTime must be valid, ordered dates.");
  }
  return roundMoney(((end - start) / 60000) * (rate / 60));
}

function calculateElapsedMinutes(startTime, endTime) {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    throw new TypeError("startTime and endTime must be valid, ordered dates.");
  }
  return (end - start) / 60000;
}

function calculateMemberDebit(totalCost, remainingMinutes, hourlyRate) {
  const cost = positiveNumber(totalCost, "totalCost");
  const minutes = positiveNumber(remainingMinutes, "remainingMinutes");
  const rate = positiveRate(hourlyRate);
  const minuteCreditValue = roundMoney(rate / 60);
  if (minuteCreditValue === 0) {
    throw new TypeError("hourlyRate is too small to represent a minute credit.");
  }
  const affordableMinuteCredits = Math.floor((cost + 0.005) / minuteCreditValue);
  const minuteCreditsUsed = Math.min(Math.floor(minutes), affordableMinuteCredits);
  const usedCreditValue = roundMoney(minuteCreditsUsed * minuteCreditValue);
  return {
    minuteCreditsUsed,
    balanceToDeduct: roundMoney(Math.max(0, cost - usedCreditValue))
  };
}

function calculateMinuteEquivalent(amount, hourlyRate) {
  const value = positiveNumber(amount, "amount");
  const rate = positiveRate(hourlyRate);
  const minuteCreditValue = roundMoney(rate / 60);
  if (minuteCreditValue === 0) {
    throw new TypeError("hourlyRate is too small to represent a minute credit.");
  }
  return Math.floor(value / minuteCreditValue);
}

module.exports = {
  calculatePrepaidCost,
  calculateOpenBilling,
  calculateElapsedMinutes,
  calculateMemberDebit,
  calculateMinuteEquivalent,
  roundMoney
};
