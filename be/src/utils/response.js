/**
 * 성공 응답
 */
function successResponse(res, data, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
}

/**
 * 에러 응답
 */
function errorResponse(res, message, statusCode = 500, errors = null) {
  const response = {
    success: false,
    message
  };
  
  if (errors) {
    response.errors = errors;
  }
  
  return res.status(statusCode).json(response);
}

module.exports = {
  successResponse,
  errorResponse
};
