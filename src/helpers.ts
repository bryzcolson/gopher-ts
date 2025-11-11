import { GOPHER_TERMINATOR } from "./constants.js";

export const formatGopherResponse = (content: string): string => {
  return content + GOPHER_TERMINATOR;
};