// Convert USD to NPR (1 USD = ~134 NPR as of 2024)
export const formatPriceToNPR = (usdPrice) => {
  const nprPrice = Math.round(usdPrice * 134);
  return `NPR ${nprPrice.toLocaleString()}`;
};

export const formatReviewCount = (count) => {
  return `(${count.toLocaleString()} reviews)`;
};
