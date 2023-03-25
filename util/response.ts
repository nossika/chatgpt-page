export enum Code {
  success = 0,
  clientError = 400,
  serverError = 500,
}

export interface APIResponse<T = any> {
  code: number;
  data: T | string;
}

export const response = <T,>(data: T, code: Code = Code.success): APIResponse<T> => {
  return {
    code,
    data,
  }
}
