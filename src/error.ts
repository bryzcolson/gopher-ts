export const GOPHER_TERMINATOR = '\r\n.\r\n';
const GOPHER_ERROR_TYPE = '3';

export const createGopherError = (message: string, hostname: string, port: number): string => {
  return `${GOPHER_ERROR_TYPE}${message}\t\t${hostname}\t${port}${GOPHER_TERMINATOR}`;
};