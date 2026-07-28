import type { ApiRequestConfig } from "@/lib/api/types";

export type RequestInterceptor = (
  url: string,
  config: ApiRequestConfig,
) => Promise<{ url: string; config: ApiRequestConfig }> | { url: string; config: ApiRequestConfig };

export type ResponseInterceptor = (response: Response) => Promise<Response> | Response;

const requestInterceptors: RequestInterceptor[] = [];
const responseInterceptors: ResponseInterceptor[] = [];

export function addRequestInterceptor(interceptor: RequestInterceptor) {
  requestInterceptors.push(interceptor);
  return () => {
    const index = requestInterceptors.indexOf(interceptor);
    if (index >= 0) requestInterceptors.splice(index, 1);
  };
}

export function addResponseInterceptor(interceptor: ResponseInterceptor) {
  responseInterceptors.push(interceptor);
  return () => {
    const index = responseInterceptors.indexOf(interceptor);
    if (index >= 0) responseInterceptors.splice(index, 1);
  };
}

export async function runRequestInterceptors(url: string, config: ApiRequestConfig) {
  let current = { url, config };
  for (const interceptor of requestInterceptors) {
    current = await interceptor(current.url, current.config);
  }
  return current;
}

export async function runResponseInterceptors(response: Response) {
  let current = response;
  for (const interceptor of responseInterceptors) {
    current = await interceptor(current);
  }
  return current;
}
