export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: any;
}

export const ok = <T>(data: T, message = "OK"): ApiResponse<T> => ({
  success: true,
  message,
  data
});

export const fail = (message = "Something went wrong", errors?: any): ApiResponse => ({
  success: false,
  message,
  errors
});
