'use client';

import React, { useState, useEffect } from 'react';
import {
  Mail,
  MailCheck,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  X,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Check,
  AlertCircle,
} from 'lucide-react';
import { User } from '@/types/auth';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
  initialStep?: 'request' | 'code' | 'new_password';
  onSuccess?: (user: User) => void;
  onReturnToLogin?: (email: string, name?: string) => void;
  showToast: (msg: string, durationMs?: number) => void;
}

export default function ForgotPasswordModal({
  isOpen,
  onClose,
  initialEmail = '',
  initialStep = 'request',
  onSuccess,
  onReturnToLogin,
  showToast,
}: ForgotPasswordModalProps) {
  const [step, setStep] = useState<'request' | 'code' | 'new_password' | 'success'>(initialStep);
  const [email, setEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Inicializa o modal sempre que aberto
  useEffect(() => {
    if (isOpen) {
      setEmail(initialEmail || '');
      setStep(initialStep || 'request');
      setCode('');
      setNewPassword('');
      setConfirmPassword('');
      setResendCooldown(0);
      setError(null);
    }
  }, [isOpen, initialEmail, initialStep]);

  // Timer para reenvio do código
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  if (!isOpen) return null;

  // Validações dos requisitos de segurança da senha (mínimo 10 caracteres e alfanumérico)
  const hasMinLength = newPassword.length >= 10;
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const isAlphanumeric = hasLetter && hasNumber;
  const isPasswordValid = hasMinLength && isAlphanumeric;
  const isMatch = confirmPassword.length > 0 && newPassword === confirmPassword;

  // ETAPA 1: Enviar código para o e-mail
  const handleSendCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError('Por favor, informe seu e-mail corporativo cadastrado.');
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        const errorMsg =
          data.error ||
          'E-mail não localizado em nossa base cadastral. Verifique a digitação ou contate o administrador.';
        setError(errorMsg);
        return;
      }

      if (data.name) {
        setUserName(data.name);
      }

      setStep('code');
      setResendCooldown(30);
      setCode('');
      setError(null);

      if (data.debugCode) {
        showToast(`Código de verificação enviado! Código de teste: ${data.debugCode}`, 10000);
      } else {
        showToast('Código de verificação enviado! Verifique sua caixa de entrada.', 5000);
      }
    } catch (err) {
      console.error('Erro ao enviar código de recuperação:', err);
      setError('Não foi possível conectar ao servidor. Tente novamente mais tarde.');
    } finally {
      setIsLoading(false);
    }
  };

  // Reenviar código
  const handleResendCode = async () => {
    if (resendCooldown > 0 || isLoading) return;
    await handleSendCode();
  };

  // ETAPA 2: Validar código de 6 dígitos
  const handleVerifyCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    if (cleanCode.length !== 6) {
      setError('Por favor, informe o código de verificação de 6 dígitos recebido por e-mail.');
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, code: cleanCode }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Código de verificação incorreto ou expirado. Verifique os números digitados.');
        return;
      }

      setStep('new_password');
      setError(null);
      showToast('Código validado com sucesso! Defina sua nova senha.');
    } catch (err) {
      console.error('Erro ao verificar código:', err);
      setError('Não foi possível conectar ao servidor. Tente novamente mais tarde.');
    } finally {
      setIsLoading(false);
    }
  };

  // ETAPA 3: Redefinir senha (conforme imagem definir_senha.png e avança para senha_atualizada.png)
  const handleResetPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    if (!cleanCode || cleanCode.length !== 6) {
      setError('Código de verificação de 6 dígitos ausente. Volte para a etapa anterior.');
      return;
    }

    if (!hasMinLength) {
      setError('A nova senha deve ter no mínimo 10 caracteres.');
      return;
    }

    if (!isAlphanumeric) {
      setError('A nova senha deve ser alfanumérica (conter ao menos uma letra e um número).');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas digitadas não coincidem.');
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          code: cleanCode,
          newPassword,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        const errorMsg = data.error || 'Não foi possível redefinir a senha.';
        setError(errorMsg);
        showToast(errorMsg);
        return;
      }

      if (data.user?.name) {
        setUserName(data.user.name);
      }

      // Avança para a tela de confirmação (senha_atualizada.png)
      setStep('success');
      setError(null);
    } catch (err) {
      console.error('Erro ao redefinir senha:', err);
      setError('Erro de conexão ao redefinir a senha.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-[28px] max-w-[460px] w-full p-7 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200 relative border border-slate-100">
        
        {/* ========================================================================= */}
        {/* CABEÇALHO DINÂMICO CONFORME A ETAPA ATUAL                                 */}
        {/* ========================================================================= */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            {step === 'request' && (
              /* Ícone da etapa 1: Chave (conforme esqueci_senha.png) */
              <div className="w-12 h-12 rounded-2xl bg-[#eefcf5] border border-[#bbf7d0] text-[#059669] flex items-center justify-center shrink-0">
                <KeyRound className="w-6 h-6 stroke-[2.2]" />
              </div>
            )}
            {step === 'code' && (
              /* Ícone da etapa 2: Envelope com Check (conforme codigo.png) */
              <div className="w-12 h-12 rounded-2xl bg-[#eefcf5] border border-[#bbf7d0] text-[#008f5d] flex items-center justify-center shrink-0">
                <MailCheck className="w-6 h-6 stroke-[2]" />
              </div>
            )}
            {step === 'new_password' && (
              /* Ícone da etapa 3: Escudo com Check (conforme definir_senha.png) */
              <div className="w-12 h-12 rounded-2xl bg-[#eefcf5] border border-[#bbf7d0] text-[#008f5d] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6 stroke-[2]" />
              </div>
            )}
            {step === 'success' && (
              /* Ícone da etapa 4: Círculo com Check (conforme senha_atualizada.png) */
              <div className="w-12 h-12 rounded-2xl bg-[#eefcf5] border border-[#bbf7d0] text-[#008f5d] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6 stroke-[2]" />
              </div>
            )}
            <div>
              <h3 className="text-[19px] font-bold text-slate-900 tracking-tight leading-snug">
                {step === 'request' && 'Recuperação de Acesso'}
                {step === 'code' && 'Código de Verificação'}
                {step === 'new_password' && 'Definir Nova Senha'}
                {step === 'success' && 'Senha Atualizada!'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {step === 'request' && 'Informe seu e-mail corporativo cadastrado'}
                {step === 'code' && 'Enviamos um código de segurança por e-mail'}
                {step === 'new_password' && 'Crie uma senha segura para seus acessos'}
                {step === 'success' && 'Sua nova senha já está ativa para uso'}
              </p>
            </div>
          </div>
          {step !== 'success' && (
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              aria-label="Fechar modal"
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* ========================================================================= */}
        {/* ETAPA 1: SOLICITAÇÃO DO CÓDIGO (esqueci_senha.png e verifica_email.png)  */}
        {/* ========================================================================= */}
        {step === 'request' && (
          <form
            id="form-modal-forgot-request"
            autoComplete="off"
            onSubmit={handleSendCode}
            className="space-y-4 pt-1"
          >
            {/* Mensagem de Erro (conforme imagem verifica_email.png) */}
            {error && (
              <div className="p-3.5 px-4 bg-[#fff1f2] border border-[#fecdd3] rounded-2xl flex items-start gap-3 text-[13px] text-[#be123c] animate-in fade-in duration-200">
                <AlertCircle className="w-5 h-5 text-[#e11d48] shrink-0 mt-0.5" />
                <span className="leading-relaxed font-normal">{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-2">
                E-mail Corporativo Cadastrado <span className="text-emerald-500 font-bold">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  id="modal-forgot-email"
                  type="email"
                  required
                  autoFocus
                  disabled={isLoading}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="usuario@cm.com.br"
                  autoComplete="email"
                  className="w-full pl-11 pr-4 py-3 bg-[#f8fafc] border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-sm disabled:opacity-50 shadow-xs"
                />
              </div>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Enviaremos um código de 6 dígitos para validar a posse da sua conta corporativa.
              </p>
            </div>

            {/* Rodapé com divisor e botões Cancelar / Enviar Código */}
            <div className="border-t border-slate-100 pt-5 flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading || !email.trim()}
                className="px-5 py-2.5 bg-[#008f5d] hover:bg-[#007a4f] active:scale-[0.99] text-white text-sm font-semibold rounded-2xl shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <span>Enviar Código</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* ETAPA 2: DIGITAÇÃO DO CÓDIGO (EXATAMENTE IGUAL imagem codigo.png)         */}
        {/* ========================================================================= */}
        {step === 'code' && (
          <form
            id="form-modal-forgot-code"
            autoComplete="off"
            onSubmit={handleVerifyCode}
            className="space-y-4 pt-1"
          >
            {/* Banner verde claro com o e-mail e pill 'Código enviado' */}
            <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-2xl p-3.5 px-4 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs sm:text-[13px] text-slate-700 truncate mr-2">
                <strong className="text-slate-900 font-bold">E-mail:</strong>
                <span className="truncate">{email}</span>
              </div>
              <div className="shrink-0 px-3 py-1 bg-[#dcfce7] text-[#047857] text-xs font-semibold rounded-lg">
                Código enviado
              </div>
            </div>

            {/* Mensagem de Erro se o código estiver incorreto */}
            {error && (
              <div className="p-3.5 px-4 bg-[#fff1f2] border border-[#fecdd3] rounded-2xl flex items-start gap-3 text-[13px] text-[#be123c] animate-in fade-in duration-200">
                <AlertCircle className="w-5 h-5 text-[#e11d48] shrink-0 mt-0.5" />
                <span className="leading-relaxed font-normal">{error}</span>
              </div>
            )}

            {/* Campo do Código de 6 Dígitos */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-2">
                Código de 6 Dígitos <span className="text-emerald-500 font-bold">*</span>
              </label>
              <input
                id="modal-verify-code-input"
                type="text"
                inputMode="numeric"
                autoFocus
                required
                disabled={isLoading}
                maxLength={6}
                value={code}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setCode(val);
                  if (error) setError(null);
                }}
                placeholder="0 0 0 0 0 0"
                autoComplete="one-time-code"
                className={`w-full px-4 py-3.5 bg-[#f8fafc] border border-slate-200 rounded-2xl text-slate-800 text-center font-mono text-xl sm:text-2xl font-bold placeholder:text-slate-400 placeholder:font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all shadow-xs disabled:opacity-50 ${
                  code ? 'tracking-[0.45em]' : 'tracking-[0.2em]'
                }`}
              />

              {/* Linha 'Não recebeu a mensagem? Reenviar código' */}
              <div className="flex items-center justify-between mt-2.5 text-xs">
                <span className="text-slate-400 font-normal">Não recebeu a mensagem?</span>
                <button
                  type="button"
                  disabled={isLoading || resendCooldown > 0}
                  onClick={handleResendCode}
                  className="font-semibold text-[#008f5d] hover:text-[#007a4f] hover:underline cursor-pointer disabled:text-slate-400 disabled:no-underline disabled:cursor-not-allowed transition-colors"
                >
                  {resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : 'Reenviar código'}
                </button>
              </div>
            </div>

            {/* Rodapé: Alterar e-mail à esquerda e Validar Código à direita */}
            <div className="border-t border-slate-100 pt-5 flex items-center justify-between gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setStep('request');
                  setError(null);
                }}
                disabled={isLoading}
                className="text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Alterar e-mail</span>
              </button>
              <button
                type="submit"
                disabled={isLoading || code.trim().length !== 6}
                className="px-5 py-2.5 bg-[#008f5d] hover:bg-[#007a4f] active:scale-[0.99] text-white text-sm font-semibold rounded-2xl shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Validando...</span>
                  </>
                ) : (
                  <>
                    <span>Validar Código</span>
                    <Check className="w-4 h-4 stroke-[2.5]" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* ETAPA 3: DEFINIÇÃO DA NOVA SENHA (EXATAMENTE IGUAL definir_senha.png)     */}
        {/* ========================================================================= */}
        {step === 'new_password' && (
          <form
            id="form-modal-forgot-new-password"
            autoComplete="off"
            onSubmit={handleResetPassword}
            className="space-y-4 pt-1"
          >
            {/* Mensagem de Erro se houver */}
            {error && (
              <div className="p-3.5 px-4 bg-[#fff1f2] border border-[#fecdd3] rounded-2xl flex items-start gap-3 text-[13px] text-[#be123c] animate-in fade-in duration-200">
                <AlertCircle className="w-5 h-5 text-[#e11d48] shrink-0 mt-0.5" />
                <span className="leading-relaxed font-normal">{error}</span>
              </div>
            )}

            {/* Campo Nova Senha */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-2">
                Nova Senha <span className="text-emerald-500 font-bold">*</span>
              </label>
              <input
                id="modal-reset-new-password"
                type="password"
                required
                disabled={isLoading}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="••••••••"
                autoComplete="new-password"
                className="w-full px-4 py-3 bg-[#f8fafc] border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-sm shadow-xs disabled:opacity-50"
              />
            </div>

            {/* Campo Confirmação da Nova Senha */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-2">
                Confirme a Nova Senha <span className="text-emerald-500 font-bold">*</span>
              </label>
              <input
                id="modal-reset-confirm-password"
                type="password"
                required
                disabled={isLoading}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="••••••••"
                autoComplete="new-password"
                className="w-full px-4 py-3 bg-[#f8fafc] border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-sm shadow-xs disabled:opacity-50"
              />
            </div>

            {/* Card de Requisitos de Segurança da Senha */}
            <div className="bg-[#f8fafc] border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-2.5">
              <h4 className="text-xs sm:text-[13px] font-bold text-slate-800">
                Requisitos de Segurança da Senha:
              </h4>
              <div className="space-y-2 text-xs">
                <div className={`flex items-center gap-2 transition-colors ${hasMinLength ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                  <Check className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
                  <span>Mínimo de 10 caracteres</span>
                </div>
                <div className={`flex items-center gap-2 transition-colors ${isAlphanumeric ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                  <Check className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
                  <span>Alfanumérica (conter letras e números)</span>
                </div>
              </div>
            </div>

            {/* Rodapé com divisor e botões Cancelar / Salvar Nova Senha */}
            <div className="border-t border-slate-100 pt-5 flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading || !isPasswordValid || !isMatch}
                className="px-5 py-2.5 bg-[#008f5d] hover:bg-[#007a4f] active:scale-[0.99] text-white text-sm font-semibold rounded-2xl shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 stroke-[2.2]" />
                    <span>Salvar Nova Senha</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* ETAPA 4: SENHA ATUALIZADA COM SUCESSO (conforme senha_atualizada.png)     */}
        {/* ========================================================================= */}
        {step === 'success' && (
          <div className="pt-2 pb-1 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-200">
            {/* Círculo verde central com ícone de checkmark */}
            <div className="w-16 h-16 rounded-full bg-[#dcfce7] flex items-center justify-center text-[#008f5d] mb-4">
              <Check className="w-8 h-8 stroke-[2.5]" />
            </div>

            {/* Título Central */}
            <h4 className="text-[19px] font-bold text-slate-900 tracking-tight">
              Senha Alterada com Sucesso!
            </h4>

            {/* Descrição Central */}
            <p className="text-xs sm:text-[13px] text-slate-500 mt-2 leading-relaxed max-w-xs mx-auto">
              Sua nova credencial corporativa foi cadastrada no sistema.
              Você já pode fazer login na plataforma normalmente.
            </p>

            {/* Botão de largura total 'Voltar para o Login' */}
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onReturnToLogin) {
                  onReturnToLogin(email, userName);
                }
              }}
              className="w-full mt-6 py-3.5 px-4 bg-[#008f5d] hover:bg-[#007a4f] active:scale-[0.99] text-white font-semibold text-sm rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Voltar para o Login</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
