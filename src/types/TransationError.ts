export type TransationError = {
  error: Error;
  response: Response | undefined;
  unknownError?: any;
};
