import { UseCaseError } from "../usecases/usecase.helpers.js";

export const respondToUseCaseError = (
  res,
  error,
  fallbackMessage,
  { includeSuccess = false, includeError = false } = {}
) => {
  const isUseCaseError = error instanceof UseCaseError;
  const message = isUseCaseError ? error.message : fallbackMessage;
  const response = {
    ...(includeSuccess ? { success: false } : {}),
    message,
  };

  if (includeError || !isUseCaseError) {
    response.error = message;
  }

  return res.status(isUseCaseError ? error.statusCode : 500).json(response);
};
