const asyncHandler = (fn) => (req, res, next) => {
  return Promise.resolve(fn(req, res, next)).catch((err) => {
    res.status(err.status || 500).json({
      success: false,
      message: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  });
};
export { asyncHandler };
