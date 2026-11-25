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

function calculateUncoveredMinutes(startTime, endTime, extensions = []) {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    throw new TypeError("startTime and endTime must be valid, ordered dates.");
  }

  let coveredUntil = start;
  let uncoveredMilliseconds = 0;
  const orderedExtensions = [...extensions].sort(
    (left, right) => new Date(left.extendedAt).getTime() - new Date(right.extendedAt).getTime()
  );
  for (const extension of orderedExtensions) {
    const extendedAt = new Date(extension.extendedAt).getTime();
    const addedMinutes = Number(extension.addedMinutes);
    if (!Number.isFinite(extendedAt) || !Number.isSafeInteger(addedMinutes) || addedMinutes <= 0) {
      throw new TypeError("Session extensions must have a valid date and positive whole minutes.");
    }
    if (extendedAt >= end) continue;

    const coverageStart = Math.max(start, extendedAt);
    if (coverageStart > coveredUntil) uncoveredMilliseconds += coverageStart - coveredUntil;
    coveredUntil = Math.max(coveredUntil, coverageStart) + addedMinutes * 60000;
  }
  if (end > coveredUntil) uncoveredMilliseconds += end - coveredUntil;
  return uncoveredMilliseconds / 60000;
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
  calculateUncoveredMinutes,
  calculateMemberDebit,
  calculateMinuteEquivalent,
  roundMoney
};
