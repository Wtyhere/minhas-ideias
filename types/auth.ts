export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  status: 'active' | 'inactive';
  createdAt: string;
  cnpj?: string;
  unit?: string;
  mustChangePassword?: boolean;
}

export interface LoginCredentials {
  email: string;
  password?: string;
}

export interface AuthSession {
  user: User;
  token?: string;
  expiresAt?: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
}
