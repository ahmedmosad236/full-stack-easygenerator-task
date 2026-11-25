import axios from 'axios';

export interface ApiErrorPayload {
  statusCode?: number;
  error?: string;
  message?: string | string[];
}

export function extractApiErrorMessage(
  error: unknown,
  fallbackMessage = 'Something went wrong. Please try again.',
): string {
  if (axios.isAxiosError<ApiErrorPayload>(error)) {
    const data = error.response?.data;
    if (data) {
      if (Array.isArray(data.message) && data.message.length > 0) {
        return data.message.join(' ');
      }
      if (typeof data.message === 'string' && data.message.trim().length > 0) {
        return data.message;
      }
    }

    if (error.response?.status === 429) {
      return 'Too many requests. Please wait a moment and try again.';
    }

    if (!error.response) {
      return 'Unable to reach the server. Please check your connection.';
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallbackMessage;
}
