export enum Code {
  Success = 0,
  ClientError = 400,
  Forbidden = 403,
  NotFound = 404,
  ServerError = 500,
}

export interface APIResponse<T = any> {
  code: number;
  data: T | string;
}

export const response = <T,>(data: T, code: Code = Code.Success): APIResponse<T> => {
  return {
    code,
    data,
  }
}
