export const GOPHER_TERMINATOR = '\r\n.\r\n';
const GOPHER_ERROR_TYPE = '3';
const GOPHER_ERROR_HOST = 'error.host';
const GOPHER_ERROR_PORT = '1';

export const createGopherError = (message: string): string => {
  return `${GOPHER_ERROR_TYPE}${message}\t\t${GOPHER_ERROR_HOST}\t${GOPHER_ERROR_PORT}${GOPHER_TERMINATOR}`;
};