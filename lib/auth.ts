import { User, AuthResponse } from '@/types/auth';

export const INITIAL_USERS: User[] = [
  {
    id: 'usr-1',
    name: 'Supermercado Modelo (Matriz)',
    cnpj: '07.123.456/0001-89',
    email: 'usuario@cm.com.br',
    role: 'user',
    status: 'active',
    createdAt: '2026-01-15',
    unit: 'Loja Matriz - Supermercado Modelo',
  },
  {
    id: 'usr-2',
    name: 'Administrador Casa Magalhães',
    cnpj: '03.882.112/0001-40',
    email: 'adrmin@cm.com.br',
    role: 'admin',
    status: 'active',
    createdAt: '2026-01-01',
    unit: 'P&D Casa Magalhães',
  },
  {
    id: 'usr-3',
    name: 'Fernanda Rocha - Hipermercado Atlântico',
    cnpj: '12.456.789/0001-10',
    email: 'fernanda@atlantico.com.br',
    role: 'user',
    status: 'active',
    createdAt: '2026-02-10',
    unit: 'Hipermercado Atlântico',
  },
  {
    id: 'usr-4',
    name: 'Juliana Mendes - Rede Super Giro',
    cnpj: '24.987.654/0001-33',
    email: 'juliana@supergiro.com.br',
    role: 'user',
    status: 'inactive',
    createdAt: '2026-03-05',
    unit: 'Rede Super Giro',
  },
];

export function authenticateUser(email: string, password?: string): AuthResponse {
  const cleanEmail = (email || '').trim().toLowerCase();

  if (!cleanEmail) {
    return {
      success: false,
      error: 'Por favor, insira o seu e-mail corporativo.',
    };
  }

  // Verifica se o usuário cadastrado está inativo
  const registeredUser = INITIAL_USERS.find(
    (u) => u.email.toLowerCase() === cleanEmail
  );

  if (registeredUser && registeredUser.status === 'inactive') {
    return {
      success: false,
      error: 'Acesso bloqueado: Este usuário está marcado como Inativo.',
    };
  }

  // Tratativa para administrador (suporta admin@cm.com.br e adrmin@cm.com.br)
  if (
    cleanEmail === 'adrmin@cm.com.br' ||
    cleanEmail === 'admin@cm.com.br' ||
    (registeredUser && registeredUser.role === 'admin')
  ) {
    const adminUser: User = {
      id: registeredUser?.id || 'usr-admin',
      email: registeredUser?.email || cleanEmail,
      name: registeredUser?.name || 'Administrador Casa Magalhães',
      role: 'admin',
      status: 'active',
      cnpj: registeredUser?.cnpj || '03.882.112/0001-40',
      unit: registeredUser?.unit || 'P&D Casa Magalhães',
      createdAt: registeredUser?.createdAt || '2026-01-01',
    };

    return {
      success: true,
      user: adminUser,
    };
  }

  // Tratativa para usuário comum ou parceiro cadastrado
  if (registeredUser) {
    return {
      success: true,
      user: registeredUser,
    };
  }

  // Usuário corporativo não pré-cadastrado: cria perfil dinâmico de supermercadista
  const dynamicUser: User = {
    id: `usr-${Date.now()}`,
    email: cleanEmail,
    name: cleanEmail === 'usuario@cm.com.br' ? 'Supermercado Parceiro CM' : cleanEmail.split('@')[0],
    role: 'user',
    status: 'active',
    unit: 'Loja Matriz - Supermercado Parceiro',
    createdAt: new Date().toISOString().split('T')[0],
  };

  return {
    success: true,
    user: dynamicUser,
  };
}
