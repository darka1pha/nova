export interface AuthResult {
  success: boolean;
  error?: string;
}

export interface Session {
  userId: string;
  email: string;
}
