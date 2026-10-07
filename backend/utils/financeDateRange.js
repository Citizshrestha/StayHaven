export const resolveFinanceDateRange = (query = {}) => {
  const { dateRange, dateFrom, dateTo } = query;
  const endDate = dateTo ? new Date(dateTo) : new Date();
  let startDate;

  if (dateFrom) {
    startDate = new Date(dateFrom);
  } else if (dateRange === "7d") {
    startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 7);
  } else if (dateRange === "90d") {
    startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 90);
  } else {
    startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 30);
  }

  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  return { startDate, endDate };
};
