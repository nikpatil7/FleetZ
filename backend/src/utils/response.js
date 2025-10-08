import httpStatus from 'http-status';

export const successResponse = (res, data = null, message = 'Success', statusCode = httpStatus.OK) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

export const errorResponse = (res, message = 'Error', statusCode = httpStatus.INTERNAL_SERVER_ERROR, data = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

export const paginatedResponse = (res, data, pagination, message = 'Success', statusCode = httpStatus.OK) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    pagination,
    timestamp: new Date().toISOString()
  });
};
