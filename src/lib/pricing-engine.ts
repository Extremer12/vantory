export interface PricingResult {
  finalSalePrice: number;
  contributionMargin: number;
  marginPercentage: number;
  breakEvenUnits: number;
}

export const calculatePricingEngine = (
  costPrice: number,
  targetMarginPercent: number,
  taxRate: number = 0,
  platformFeePercent: number = 0,
  fixedMonthlyCosts: number = 0
): PricingResult => {
  const totalDeductions = (targetMarginPercent + taxRate + platformFeePercent) / 100;
  
  if (totalDeductions >= 1) {
    return { finalSalePrice: 0, contributionMargin: 0, marginPercentage: 0, breakEvenUnits: 0 };
  }

  const finalSalePrice = costPrice / (1 - totalDeductions);
  const contributionMargin =
    finalSalePrice - costPrice -
    finalSalePrice * (taxRate / 100) -
    finalSalePrice * (platformFeePercent / 100);
  const marginPercentage = (contributionMargin / finalSalePrice) * 100;
  const breakEvenUnits =
    fixedMonthlyCosts > 0 && contributionMargin > 0
      ? Math.ceil(fixedMonthlyCosts / contributionMargin)
      : 0;

  return { finalSalePrice, contributionMargin, marginPercentage, breakEvenUnits };
};
