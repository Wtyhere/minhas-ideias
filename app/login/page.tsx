'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lightbulb, ChevronRight, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';

interface Toast {
  id: number;
  message: string;
  visible: boolean;
}

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('usuario@cm.com.br');
  const [password, setPassword] = useState('123456');
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, visible: false }]);

    requestAnimationFrame(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, visible: true } : t))
      );
    });

    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, visible: false } : t))
      );
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 300);
    }, 3500);
  };

  const executeLogin = async (loginEmail: string, loginPass: string) => {
    const result = await login({ email: loginEmail, password: loginPass });

    if (!result.success) {
      showToast(result.error || 'Acesso bloqueado: Este usuário está marcado como Inativo.');
      return;
    }

    const cleanEmail = (loginEmail || '').trim().toLowerCase();
    if (
      cleanEmail === 'adrmin@cm.com.br' ||
      cleanEmail === 'admin@cm.com.br'
    ) {
      showToast('Bem-vindo, Administrador Casa Magalhães!');
    } else {
      showToast('Bem-vindo ao Minhas Ideias na CM!');
    }

    setTimeout(() => {
      router.push('/');
      router.refresh();
    }, 600);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeLogin(email, password);
  };

  return (
    <>
      {/* TOAST NOTIFICATION CONTAINER */}
      <div
        id="toast-container"
        className="fixed bottom-5 right-5 z-50 pointer-events-none space-y-2"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`bg-slate-900 text-white text-xs sm:text-sm font-semibold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 border border-slate-800 pointer-events-auto transform transition-all duration-300 ${
              t.visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/40 to-teal-50/30 flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-3xl shadow-xl shadow-emerald-950/5 p-8 relative overflow-hidden">
          <div className="text-center mb-7 relative z-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25 mb-3.5 ring-4 ring-emerald-50">
              <Lightbulb className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Minhas Ideias na CM</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed max-w-xs mx-auto">
              Sua voz constrói o futuro do <span className="text-emerald-700 font-semibold">Varejofacil</span> e <span className="text-teal-700 font-semibold">SysPDV</span>
              Aqui é um teste
            </p>
          </div>

          <form id="login-form" onSubmit={handleSubmit} className="space-y-4 relative z-10">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                E-mail Corporativo
              </label>
              <input
                id="input-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@cm.com.br"
                className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-sm shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Senha de Acesso
              </label>
              <input
                id="input-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-sm shadow-sm"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.99] text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/20 transition-all text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Entrar no Portal</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 relative z-10">
            <p className="text-xs text-center text-slate-400 font-medium mb-3">Atalhos rápidos para demonstração:</p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                id="btn-shortcut-user"
                onClick={() => {
                  setEmail('usuario@cm.com.br');
                  setPassword('123456');
                  executeLogin('usuario@cm.com.br', '123456');
                }}
                className="p-3 bg-emerald-50/60 hover:bg-emerald-50 border border-emerald-100 rounded-xl text-left text-xs transition-colors group cursor-pointer"
              >
                <div className="font-semibold text-emerald-800 group-hover:text-emerald-900">Supermercadista</div>
                <div className="text-[11px] text-slate-500 truncate mt-0.5">usuario@cm.com.br</div>
              </button>

              <button
                type="button"
                id="btn-shortcut-admin"
                onClick={() => {
                  setEmail('adrmin@cm.com.br');
                  setPassword('123456');
                  executeLogin('adrmin@cm.com.br', '123456');
                }}
                className="p-3 bg-teal-50/60 hover:bg-teal-50 border border-teal-100 rounded-xl text-left text-xs transition-colors group cursor-pointer"
              >
                <div className="font-semibold text-teal-800 group-hover:text-teal-900">Admin Casa Magalhães</div>
                <div className="text-[11px] text-slate-500 truncate mt-0.5">adrmin@cm.com.br</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
