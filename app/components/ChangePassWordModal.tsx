'use client';

import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Loader2, ShieldAlert, CheckCircle2, Circle } from 'lucide-react';

interface ChangePasswordModalProps {
  onSuccess: (newPassword: string) => Promise<void>;
}

export default function ChangePasswordModal({ onSuccess }: ChangePasswordModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const hasMinLength = newPassword.length >= 10;
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const isAlphanumeric = hasLetter && hasNumber;
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!hasMinLength) {
      setError('A nova senha deve ter no mínimo 10 caracteres.');
      return;
    }

    if (!isAlphanumeric) {
      setError('A nova senha deve ser alfanumérica (conter ao menos uma letra e um número).');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem. Verifique e tente novamente.');
      return;
    }

    setLoading(true);
    try {
      await onSuccess(newPassword);
    } catch (err: any) {
      setError(err.message || 'Erro ao alterar a senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200 p-8 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 mb-3 ring-4 ring-amber-50/50">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Alteração de Senha Obrigatória</h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Por motivos de segurança, você precisa cadastrar uma nova senha pessoal de acesso antes de continuar.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Nova Senha
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                disabled={loading}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 10 caracteres alfanuméricos"
                className="w-full px-4 py-3 pr-12 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-sm"
              />
              <button
                type="button"
                tabIndex={-1}
                disabled={loading}
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* Checklist de requisitos de segurança */}
            <div className="mt-2.5 space-y-1.5 bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs">
              <div className={`flex items-center gap-2 ${hasMinLength ? 'text-emerald-600 font-medium' : 'text-slate-500'}`}>
                {hasMinLength ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <Circle className="w-3.5 h-3.5 shrink-0 text-slate-400" />}
                <span>Pelo menos 10 caracteres</span>
              </div>
              <div className={`flex items-center gap-2 ${isAlphanumeric ? 'text-emerald-600 font-medium' : 'text-slate-500'}`}>
                {isAlphanumeric ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <Circle className="w-3.5 h-3.5 shrink-0 text-slate-400" />}
                <span>Alfanumérica (conter letras e números)</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Confirme a Nova Senha
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              disabled={loading}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Digite a senha novamente"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-sm"
            />
            {confirmPassword.length > 0 && (
              <div className={`mt-1.5 flex items-center gap-1.5 text-xs ${passwordsMatch ? 'text-emerald-600 font-medium' : 'text-rose-500'}`}>
                {passwordsMatch ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>As senhas coincidem</span>
                  </>
                ) : (
                  <>
                    <Circle className="w-3.5 h-3.5 shrink-0" />
                    <span>As senhas não coincidem</span>
                  </>
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !hasMinLength || !isAlphanumeric || !passwordsMatch}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/20 transition-all text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Atualizando senha...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Salvar Nova Senha e Acessar</span>
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}