'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Lightbulb,
  Plus,
  Shield,
  TrendingUp,
  Users,
  LogOut,
  Calendar,
  ThumbsUp,
  ThumbsDown,
  Clock,
  CheckCircle2,
  Search,
  Filter,
  Tag,
  Store,
  Paperclip,
  MessageSquare,
  ChevronRight,
  Send,
  FileText,
  Check,
  Layers,
  X,
  Kanban,
  Building2,
  ShieldCheck,
  UserPlus,
  Pencil,
  UserX,
  UserCheck,
  AlertCircle,
  Download,
  Lock,
  Sparkles,
  Eye, 
  EyeOff,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';
import { Idea, Comment, IdeaStatus } from '@/types/idea';
import { User } from '@/types/auth';
import { INITIAL_IDEAS } from '@/lib/data';
import { INITIAL_USERS } from '@/lib/auth';

interface ToastItem {
  id: number;
  message: string;
  visible: boolean;
}

export default function HomePage() {
  const router = useRouter();
  const { user, loading, login, logout } = useAuth();

  // State matching index.html
  const [ideas, setIdeas] = useState<Idea[]>(INITIAL_IDEAS);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [activeTab, setActiveTab] = useState<'board' | 'new-idea' | 'admin-review' | 'prioritization' | 'users'>('board');
  const [statusTab, setStatusTab] = useState<'disponiveis' | 'desenvolvimento' | 'entregues'>('disponiveis');
  const [selectedProduct, setSelectedProduct] = useState<'TODOS' | 'Varejofacil' | 'SysPDV'>('TODOS');
  const [selectedCategory, setSelectedCategory] = useState<string>('TODOS');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const activeCycle = 'Ciclo 2026.2';

  // Drawers & Modals
  const [selectedIdeaDetailsId, setSelectedIdeaDetailsId] = useState<string | null>(null);
  const [commentsDrawerIdeaId, setCommentsDrawerIdeaId] = useState<string | null>(null);
  const [ideaToMergeId, setIdeaToMergeId] = useState<string | null>(null);
  const [completingIdeaId, setCompletingIdeaId] = useState<string | null>(null);
  const [buildNumberInput, setBuildNumberInput] = useState<string>('');
  const [mergeTargetId, setMergeTargetId] = useState<string>('');

  // User Management
  const [userModalOpen, setUserModalOpen] = useState<boolean>(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [userStatusFilter, setUserStatusFilter] = useState<string>('TODOS');

  // User Modal form fields
  const [modalUserName, setModalUserName] = useState('');
  const [modalUserCnpj, setModalUserCnpj] = useState('');
  const [modalUserEmail, setModalUserEmail] = useState('');
  const [modalUserRole, setModalUserRole] = useState<'admin' | 'user'>('user');
  const [modalUserStatus, setModalUserStatus] = useState<'active' | 'inactive'>('active');

  // New Idea Form fields
  const [newTitle, setNewTitle] = useState<string>('');
  const [newProduct, setNewProduct] = useState<'Varejofacil' | 'SysPDV'>('Varejofacil');
  const [newCategory, setNewCategory] = useState<string>('Frente de Loja');
  const [newPain, setNewPain] = useState<string>('');
  const [newWorkaround, setNewWorkaround] = useState<string>('');
  const [newFiles, setNewFiles] = useState<File[]>([]);

  // Comment inputs
  const [drawerCommentText, setDrawerCommentText] = useState<string>('');
  const [drawerCommentFile, setDrawerCommentFile] = useState<string | null>(null);
  const [detailsCommentText, setDetailsCommentText] = useState<string>('');
  const [detailsCommentFile, setDetailsCommentFile] = useState<string | null>(null);

  // Login form fields (when not logged in)
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Show password button
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastItem[]>([]);

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

  const calculateScore = (votes: Record<string, number> = {}) => {
    return Object.values(votes).reduce((acc, val) => acc + val, 0);
  };

  const getStatusLabel = (status: IdeaStatus | string) => {
    const map: Record<string, string> = {
      pending_review: 'Em Análise CM',
      voting: 'Em Votação Aberta',
      in_immersion: 'Em Imersão',
      in_development: 'Em Desenvolvimento',
      in_validation: 'Em Validação',
      in_pilot: 'Em Piloto',
      delivered: 'Entregue na Versão',
      merged: 'Agrupada',
      rejected: 'Recusada',
    };
    return map[status] || status;
  };

  const getStatusBadgeClass = (status: IdeaStatus | string) => {
    const map: Record<string, string> = {
      pending_review: 'bg-amber-50 text-amber-700 border-amber-200',
      voting: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      in_immersion: 'bg-sky-50 text-sky-700 border-sky-200',
      in_development: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      in_validation: 'bg-purple-50 text-purple-700 border-purple-200',
      in_pilot: 'bg-amber-50 text-amber-800 border-amber-300',
      delivered: 'bg-teal-50 text-teal-700 border-teal-200',
      merged: 'bg-purple-50 text-purple-700 border-purple-200',
      rejected: 'bg-rose-50 text-rose-700 border-rose-200',
    };
    return map[status] || 'bg-slate-50 text-slate-600 border-slate-200';
  };

  const handleVote = (ideaId: string, value: number) => {
    if (!user) return;
    if (user.role === 'admin') {
      showToast('Administradores possuem permissão apenas de visualização dos votos.');
      return;
    }

    setIdeas((prev) =>
      prev.map((idea) => {
        if (idea.id !== ideaId) return idea;
        const currentVote = idea.votes[user.email];
        const newVotes = { ...idea.votes };
        if (currentVote === value) {
          delete newVotes[user.email];
        } else {
          newVotes[user.email] = value;
        }
        return { ...idea, votes: newVotes };
      })
    );
  };

  const handleAddComment = (ideaId: string, text: string, attachmentName?: string | null) => {
    if (!user) return;
    if (user.role === 'admin') {
      showToast('Administradores estão em modo de somente leitura para comentários.');
      return;
    }
    if (!text.trim()) return;

    const newComment: Comment = {
      id: `comm-${Date.now()}`,
      userName: user.name,
      userEmail: user.email,
      text: text.trim(),
      date: new Date().toISOString().split('T')[0],
      attachmentName: attachmentName || null,
    };

    setIdeas((prev) =>
      prev.map((idea) => {
        if (idea.id !== ideaId) return idea;
        return { ...idea, comments: [...idea.comments, newComment] };
      })
    );

    showToast('Comentário registrado com sucesso!');
  };

  const movePipeline = (ideaId: string, nextStatus: IdeaStatus) => {
    setIdeas((prev) =>
      prev.map((idea) => {
        if (idea.id !== ideaId) return idea;
        return { ...idea, status: nextStatus };
      })
    );
    showToast(`Demanda atualizada para: ${getStatusLabel(nextStatus)}`);
  };

  const confirmDelivery = (ideaId: string, build: string) => {
    if (!build.trim()) {
      showToast('Por favor, informe a Build ou versão em que a demanda foi liberada.');
      return;
    }
    setIdeas((prev) =>
      prev.map((idea) => {
        if (idea.id !== ideaId) return idea;
        return { ...idea, status: 'delivered', deliveredBuild: build.trim() };
      })
    );
    setCompletingIdeaId(null);
    setBuildNumberInput('');
    showToast(`Demanda concluída e disponibilizada na ${build.trim()}!`);
  };

  const approveIdea = (id: string) => {
    setIdeas((prev) =>
      prev.map((idea) => (idea.id === id ? { ...idea, status: 'voting' } : idea))
    );
    showToast('Ideia aprovada e liberada para votação pública!');
  };

  const rejectIdea = (id: string) => {
    setIdeas((prev) =>
      prev.map((idea) => (idea.id === id ? { ...idea, status: 'rejected' } : idea))
    );
    showToast('Ideia recusada na triagem.');
  };

  const executeMerge = () => {
    if (!mergeTargetId || !ideaToMergeId) {
      showToast('Por favor, selecione uma demanda destino para agrupar.');
      return;
    }

    const sourceIdea = ideas.find((i) => i.id === ideaToMergeId);
    if (!sourceIdea) return;

    setIdeas((prev) =>
      prev.map((idea) => {
        if (idea.id === ideaToMergeId) {
          return { ...idea, status: 'merged', mergedIntoId: mergeTargetId };
        }
        if (idea.id === mergeTargetId) {
          const mergeComment: Comment = {
            id: `merge-${Date.now()}`,
            userName: 'Sistema (Agrupamento)',
            userEmail: 'sistema@cm.com.br',
            text: `A ideia "${sourceIdea.title}" foi agrupada a esta demanda por ter o mesmo escopo operacional.`,
            date: new Date().toISOString().split('T')[0],
          };
          return { ...idea, comments: [...idea.comments, mergeComment] };
        }
        return idea;
      })
    );

    setIdeaToMergeId(null);
    setMergeTargetId('');
    showToast('Ideias agrupadas com sucesso!');
  };

  const handleCreateIdea = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!newTitle.trim() || !newPain.trim() || !newWorkaround.trim()) {
      showToast('Por favor, preencha todos os campos obrigatórios!');
      return;
    }

    const createdIdea: Idea = {
      id: `ideia-${Date.now()}`,
      title: newTitle.trim(),
      product: newProduct,
      category: newCategory,
      company: user.unit || 'Supermercado Varejista',
      authorName: user.name,
      authorEmail: user.email,
      createdAt: new Date().toISOString().split('T')[0],
      cycle: activeCycle,
      painDescription: newPain.trim(),
      currentWorkaround: newWorkaround.trim(),
      attachments: newFiles.map((f) => ({
        name: f.name,
        size: `${(f.size / (1024 * 1024)).toFixed(1)} MB`,
      })),
      status: 'pending_review',
      votes: {},
      comments: [],
    };

    setIdeas((prev) => [createdIdea, ...prev]);
    setNewTitle('');
    setNewPain('');
    setNewWorkaround('');
    setNewFiles([]);
    setActiveTab('board');
    showToast('Demanda submetida com sucesso! Em análise pela equipe Casa Magalhães.');
  };

  const handleExecuteLogin = async (email: string, pass: string) => {
    const res = await login({ email, password: pass });
    if (!res.success) {
      showToast(res.error || 'Acesso bloqueado: Este usuário está marcado como Inativo.');
      return;
    }
    const cleanEmail = (email || '').trim().toLowerCase();
    if (cleanEmail === 'adrmin@cm.com.br' || cleanEmail === 'admin@cm.com.br') {
      showToast('Bem-vindo, Administrador Casa Magalhães!');
    } else {
      showToast('Bem-vindo ao Minhas Ideias na CM!');
    }
  };

  const handleLogout = async () => {
    await logout();
    setSelectedIdeaDetailsId(null);
    setCommentsDrawerIdeaId(null);
  };

  // User Management Handlers
  const handleOpenUserModal = (userId: string | null = null) => {
    setEditingUserId(userId);
    if (userId) {
      const u = users.find((item) => item.id === userId);
      if (u) {
        setModalUserName(u.name);
        setModalUserCnpj(u.cnpj || '');
        setModalUserEmail(u.email);
        setModalUserRole(u.role);
        setModalUserStatus(u.status);
      }
    } else {
      setModalUserName('');
      setModalUserCnpj('');
      setModalUserEmail('');
      setModalUserRole('user');
      setModalUserStatus('active');
    }
    setUserModalOpen(true);
  };

  const handleCloseUserModal = () => {
    setEditingUserId(null);
    setUserModalOpen(false);
  };

  const handleCnpjMask = (val: string) => {
    let value = val.replace(/\D/g, '');
    if (value.length > 14) value = value.substring(0, 14);

    if (value.length > 12) {
      value = value.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})$/, '$1.$2.$3/$4-$5');
    } else if (value.length > 8) {
      value = value.replace(/^(\d{2})(\d{3})(\d{3})(\d{1,4})$/, '$1.$2.$3/$4');
    } else if (value.length > 5) {
      value = value.replace(/^(\d{2})(\d{3})(\d{1,3})$/, '$1.$2.$3');
    } else if (value.length > 2) {
      value = value.replace(/^(\d{2})(\d{1,3})$/, '$1.$2');
    }
    setModalUserCnpj(value);
  };

  const toggleUserStatus = (userId: string) => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return;

    if (user && user.email === targetUser.email) {
      showToast('Não é permitido inativar seu próprio usuário conectado!');
      return;
    }

    const nextStatus = targetUser.status === 'active' ? 'inactive' : 'active';
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status: nextStatus } : u))
    );
    showToast(`Usuário ${targetUser.name} agora está ${nextStatus === 'active' ? 'Ativo' : 'Inativo'}.`);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalUserName.trim() || !modalUserCnpj.trim() || !modalUserEmail.trim()) {
      showToast('Por favor, preencha todos os campos obrigatórios!');
      return;
    }

    const cleanEmail = modalUserEmail.trim().toLowerCase();

    if (editingUserId) {
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id !== editingUserId) return u;
          return {
            ...u,
            name: modalUserName.trim(),
            cnpj: modalUserCnpj.trim(),
            email: cleanEmail,
            role: modalUserRole,
            status: modalUserStatus,
          };
        })
      );
      showToast(`Usuário ${modalUserName} atualizado com sucesso!`);
    } else {
      const emailExists = users.some((u) => u.email.toLowerCase() === cleanEmail);
      if (emailExists) {
        showToast('Já existe um usuário cadastrado com este e-mail.');
        return;
      }

      const newUser: User = {
        id: `usr-${Date.now()}`,
        name: modalUserName.trim(),
        cnpj: modalUserCnpj.trim(),
        email: cleanEmail,
        role: modalUserRole,
        status: modalUserStatus,
        createdAt: new Date().toISOString().split('T')[0],
      };
      setUsers((prev) => [newUser, ...prev]);
      showToast(`Usuário ${modalUserName} cadastrado com sucesso!`);
    }

    handleCloseUserModal();
  };

  // Filter ideas logic matching index.html getFilteredIdeas()
  const getFilteredIdeas = () => {
    return ideas.filter((idea) => {
      if (statusTab === 'disponiveis') {
        if (idea.status !== 'voting') return false;
      } else if (statusTab === 'desenvolvimento') {
        if (!['pending_review', 'in_immersion', 'in_development', 'in_validation', 'in_pilot'].includes(idea.status)) {
          return false;
        }
      } else if (statusTab === 'entregues') {
        if (idea.status !== 'delivered') return false;
      }

      if (selectedProduct !== 'TODOS' && idea.product !== selectedProduct) return false;

      if (selectedCategory !== 'TODOS') {
        const catFilter = selectedCategory.toLowerCase();
        const ideaCat = (idea.category || '').toLowerCase();
        if (!ideaCat.includes(catFilter) && !catFilter.includes(ideaCat)) {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = idea.title.toLowerCase().includes(query);
        const matchPain = idea.painDescription.toLowerCase().includes(query);
        const matchWorkaround = idea.currentWorkaround.toLowerCase().includes(query);
        const matchCategory = (idea.category || '').toLowerCase().includes(query);
        if (!matchTitle && !matchPain && !matchWorkaround && !matchCategory) return false;
      }
      return true;
    });
  };

  // If user is not authenticated, render pixel perfect login from index.html!
  if (!user && !loading) {
    return (
      <>
        <div id="toast-container" className="fixed bottom-5 right-5 z-50 pointer-events-none space-y-2">
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
              </p>
            </div>
            <form
              id="login-form"
              onSubmit={async (e) => {
                e.preventDefault();
                setIsLoading(true);
                try {
                  await handleExecuteLogin(loginEmail, loginPassword);
                } finally {
                  // Caso queira desativar o loading se falhar, ou redirecionar se passar
                  setIsLoading(false);
                }
              }}
              className="space-y-4 relative z-10"
            >
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  E-mail Corporativo
                </label>
                <input
                  id="input-email"
                  type="email"
                  required
                  disabled={isLoading}
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-sm shadow-sm disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Senha de Acesso
                </label>
                <div className="relative">
                  <input
                    id="input-password"
                    type={showPassword ? "text" : "password"}
                    required
                    disabled={isLoading}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-sm shadow-sm disabled:opacity-50"
                  />
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors disabled:opacity-50"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.99] text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/20 transition-all text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Entrando...</span>
                  </>
                ) : (
                  <>
                    <span>Entrar no Portal</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

          </div>
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/70 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Selected idea for drawers
  const selectedIdeaDetails = ideas.find((i) => i.id === selectedIdeaDetailsId) || null;
  const commentsDrawerIdea = ideas.find((i) => i.id === commentsDrawerIdeaId) || null;
  const ideaToMerge = ideas.find((i) => i.id === ideaToMergeId) || null;
  const completingIdea = ideas.find((i) => i.id === completingIdeaId) || null;

  const pendingCount = ideas.filter((i) => i.status === 'pending_review').length;
  const filteredIdeas = getFilteredIdeas();

  const statusCounts = {
    disponiveis: ideas.filter((i) => i.status === 'voting').length,
    desenvolvimento: ideas.filter((i) =>
      ['pending_review', 'in_immersion', 'in_development', 'in_validation', 'in_pilot'].includes(i.status)
    ).length,
    entregues: ideas.filter((i) => i.status === 'delivered').length,
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50/70 text-slate-800 selection:bg-emerald-100 selection:text-emerald-900 font-sans">
      {/* TOAST NOTIFICATION CONTAINER */}
      <div id="toast-container" className="fixed bottom-5 right-5 z-50 pointer-events-none space-y-2">
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

      {/* HEADER (renderHeader) */}
      <header className="bg-white/85 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => setActiveTab('board')}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 tracking-tight text-base">Casa Magalhães</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-semibold">
                  Minhas Ideias na CM
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Inovação Colaborativa no Varejo</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1.5 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/70">
            <button
              onClick={() => setActiveTab('board')}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'board'
                  ? 'bg-white text-emerald-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              Mural de Ideias
            </button>

            {user?.role !== 'admin' && (
              <button
                onClick={() => setActiveTab('new-idea')}
                className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'new-idea'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Contar Minha Dor</span>
              </button>
            )}

            {user?.role === 'admin' && (
              <>
                <button
                  onClick={() => setActiveTab('admin-review')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'admin-review'
                      ? 'bg-teal-700 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Triagem</span>
                  {pendingCount > 0 && (
                    <span className="px-1.5 py-0.2 bg-amber-400 text-amber-950 font-bold rounded-full text-[10px]">
                      {pendingCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('prioritization')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'prioritization'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Ciclos & Roadmap</span>
                </button>

                <button
                  onClick={() => setActiveTab('users')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'users'
                      ? 'bg-teal-700 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Gestão de Usuários</span>
                </button>
              </>
            )}
          </nav>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5 justify-end">
                <span>{user?.name}</span>
                {user?.role === 'admin' ? (
                  <span className="bg-teal-50 text-teal-700 text-[10px] px-2 py-0.5 rounded-full border border-teal-200 font-medium">
                    Admin
                  </span>
                ) : (
                  <span className="bg-emerald-50 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full border border-emerald-200 font-medium">
                    Supermercadista
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500 truncate max-w-[180px]">{user?.email}</div>
            </div>

            <button
              onClick={handleLogout}
              title="Encerrar Sessão"
              className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-500 border border-slate-200 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sub-nav mobile */}
        <div className="md:hidden flex items-center justify-around border-t border-slate-200 px-2 py-1.5 bg-white text-xs">
          <button
            onClick={() => setActiveTab('board')}
            className={`py-1 px-2 rounded cursor-pointer ${activeTab === 'board' ? 'text-emerald-700 font-bold' : 'text-slate-600'}`}
          >
            Mural
          </button>
          {user?.role !== 'admin' ? (
            <button
              onClick={() => setActiveTab('new-idea')}
              className={`py-1 px-2 rounded cursor-pointer ${activeTab === 'new-idea' ? 'text-emerald-700 font-bold' : 'text-slate-600'}`}
            >
              + Ideia
            </button>
          ) : (
            <>
              <button
                onClick={() => setActiveTab('admin-review')}
                className={`py-1 px-2 rounded cursor-pointer ${activeTab === 'admin-review' ? 'text-teal-700 font-bold' : 'text-slate-600'}`}
              >
                Triagem ({pendingCount})
              </button>
              <button
                onClick={() => setActiveTab('prioritization')}
                className={`py-1 px-2 rounded cursor-pointer ${activeTab === 'prioritization' ? 'text-indigo-700 font-bold' : 'text-slate-600'}`}
              >
                Ciclos
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`py-1 px-2 rounded cursor-pointer ${activeTab === 'users' ? 'text-teal-700 font-bold' : 'text-slate-600'}`}
              >
                Usuários
              </button>
            </>
          )}
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* TAB 1: BOARD */}
        {activeTab === 'board' && (
          <div className="space-y-6">
            {/* Hero Banner */}
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-teal-700 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg shadow-emerald-900/10">
              <div className="max-w-2xl relative z-10">
                <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-emerald-100 border border-white/20 mb-3">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{activeCycle} • Participe da Decisão</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight">
                  Qual dor na sua loja consome tempo precioso da sua equipe?
                </h2>
                <p className="text-emerald-100 text-sm mt-2 leading-relaxed">
                  Não sofra mais com planilhas paralelas e rotinas manuais. Compartilhe como você contorna os problemas no dia a dia. As melhorias mais votadas entram diretamente no planejamento do <strong>Varejofacil</strong> e <strong>SysPDV</strong>.
                </p>

                {user?.role !== 'admin' ? (
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => setActiveTab('new-idea')}
                      className="px-5 py-3 bg-white hover:bg-emerald-50 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-2 shadow-md transition-all hover:scale-[1.02] cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Cadastrar Minha Dor e Contorno</span>
                    </button>
                    <span className="text-xs text-emerald-100/90 font-medium">
                      Leva menos de 3 minutos e direciona o nosso time de P&D.
                    </span>
                  </div>
                ) : (
                  <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 text-xs text-emerald-100 border border-white/20">
                    <Shield className="w-3.5 h-3.5 text-emerald-200" />
                    <span>Visão Administrativa: Faça a curadoria na Triagem ou priorize demandas nos Ciclos & Roadmap.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Tabs de Status: Disponíveis, Desenvolvimento, Entregues */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-2 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 overflow-x-auto p-0.5">
                <button
                  onClick={() => setStatusTab('disponiveis')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                    statusTab === 'disponiveis'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>Disponíveis</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      statusTab === 'disponiveis'
                        ? 'bg-white/20 text-white'
                        : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    {statusCounts.disponiveis}
                  </span>
                </button>

                <button
                  onClick={() => setStatusTab('desenvolvimento')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                    statusTab === 'desenvolvimento'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Desenvolvimento</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      statusTab === 'desenvolvimento'
                        ? 'bg-white/20 text-white'
                        : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                    }`}
                  >
                    {statusCounts.desenvolvimento}
                  </span>
                </button>

                <button
                  onClick={() => setStatusTab('entregues')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                    statusTab === 'entregues'
                      ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Entregues</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      statusTab === 'entregues'
                        ? 'bg-white/20 text-white'
                        : 'bg-teal-50 text-teal-800 border border-teal-200'
                    }`}
                  >
                    {statusCounts.entregues}
                  </span>
                </button>
              </div>

              <div className="text-[11px] text-slate-500 font-medium px-2 py-1 text-right hidden lg:block">
                {statusTab === 'disponiveis' && 'Apenas ideias em votação pública aberta'}
                {statusTab === 'desenvolvimento' && 'Demandas em triagem pela CM e em desenvolvimento de engenharia'}
                {statusTab === 'entregues' && 'Funcionalidades já disponibilizadas na versão oficial do ERP/PDV'}
              </div>
            </div>

            {/* Barra de Filtros e Busca */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3">
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar por dor, título ou setor..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition-all"
                  />
                </div>

                {/* Filtro de Sistema */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  <span className="text-xs text-slate-500 flex items-center gap-1 font-semibold pl-1">
                    <Filter className="w-3.5 h-3.5 text-emerald-600" /> Sistema:
                  </span>
                  {(['TODOS', 'Varejofacil', 'SysPDV'] as const).map((prod) => (
                    <button
                      key={prod}
                      onClick={() => setSelectedProduct(prod)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        selectedProduct === prod
                          ? prod === 'Varejofacil'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : prod === 'SysPDV'
                            ? 'bg-teal-700 text-white shadow-xs'
                            : 'bg-slate-800 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
                      }`}
                    >
                      {prod}
                    </button>
                  ))}
                </div>

                {/* Filtro de Área / Setor */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:bg-white transition-all">
                    <Tag className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="text-xs font-semibold text-slate-600 shrink-0">Área:</span>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer pr-2"
                    >
                      <option value="TODOS">Todas as Áreas / Setores</option>
                      <option value="Frente de Loja">Frente de Loja & Caixas</option>
                      <option value="Estoque">Estoque & Recebimento</option>
                      <option value="Fiscal">Fiscal & Contabilidade</option>
                      <option value="Financeiro">Financeiro & Tesouraria</option>
                      <option value="Comercial">Comercial & Compras</option>
                      <option value="Prevenção de Perdas">Prevenção de Perdas</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Lista Horizontal de Cards */}
            <div className="flex flex-col gap-4">
              {filteredIdeas.map((idea) => {
                const score = calculateScore(idea.votes);
                const userVote = user ? idea.votes[user.email] || 0 : 0;
                const isSysPDV = idea.product === 'SysPDV';

                return (
                  <div
                    key={idea.id}
                    className="bg-white border border-slate-200/80 hover:border-emerald-300 rounded-2xl sm:rounded-3xl p-5 sm:p-6 transition-all hover:shadow-md hover:shadow-emerald-950/5 group flex flex-col justify-between gap-4"
                  >
                    <div>
                      {/* Topo do Card */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-xs font-bold px-3 py-1 rounded-full border ${
                              isSysPDV
                                ? 'bg-teal-50 text-teal-800 border-teal-200'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}
                          >
                            {idea.product}
                          </span>

                          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                            <Tag className="w-3 h-3 text-slate-400" />
                            <span>{idea.category}</span>
                          </span>

                          <span className="text-[11px] text-slate-400 hidden sm:inline">•</span>
                          <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                            {idea.cycle}
                          </span>

                          {idea.status === 'delivered' && idea.deliveredBuild && (
                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1 shadow-2xs">
                              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                              <span>Disponível na {idea.deliveredBuild}</span>
                            </span>
                          )}
                        </div>

                        <span
                          className={`text-xs font-bold px-3 py-1 rounded-full border ${getStatusBadgeClass(
                            idea.status
                          )}`}
                        >
                          {getStatusLabel(idea.status)}
                        </span>
                      </div>

                      {/* Título */}
                      <h3
                        onClick={() => setSelectedIdeaDetailsId(idea.id)}
                        className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors cursor-pointer leading-snug"
                      >
                        {idea.title}
                      </h3>

                      {/* Autor e Loja */}
                      <div className="text-xs text-slate-500 mt-1.5 flex flex-wrap items-center gap-2">
                        <span className="flex items-center gap-1 text-slate-700 font-medium">
                          <Store className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{idea.company}</span>
                        </span>
                        <span className="text-slate-300">•</span>
                        <span>Enviado por {idea.authorName}</span>
                        <span className="text-slate-300">•</span>
                        <span>{idea.createdAt}</span>
                      </div>

                      {/* Dor na Operação */}
                      <div className="mt-3.5 bg-rose-50/40 p-3.5 rounded-2xl border border-rose-100/80">
                        <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block mb-1">
                          Dor na Operação:
                        </span>
                        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                          {idea.painDescription}
                        </p>
                      </div>

                      {/* Insumos */}
                      {idea.attachments && idea.attachments.length > 0 && (
                        <div className="mt-2.5 flex items-center gap-1.5 text-xs text-slate-500">
                          <Paperclip className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="font-semibold text-slate-700">
                            {idea.attachments.length} insumo(s) anexado(s)
                          </span>
                          <span className="text-[11px] text-slate-400">(planilhas/documentos)</span>
                        </div>
                      )}
                    </div>

                    {/* Rodapé com Comentários e Curtidas */}
                    <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        {/* Botão Comentários */}
                        <button
                          onClick={() => setCommentsDrawerIdeaId(idea.id)}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-emerald-800 bg-slate-50 hover:bg-emerald-50/70 border border-slate-200 hover:border-emerald-200 transition-all flex items-center gap-2 shadow-2xs cursor-pointer"
                          title="Ver comentários no painel lateral"
                        >
                          <MessageSquare className="w-4 h-4 text-emerald-600" />
                          <span>Comentários</span>
                          <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                            {idea.comments.length}
                          </span>
                          {user?.role === 'admin' && (
                            <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">
                              (Apenas leitura)
                            </span>
                          )}
                        </button>

                        {/* Bloco de Votos */}
                        {idea.status === 'voting' ? (
                          user?.role === 'admin' ? (
                            <div
                              className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs text-xs text-slate-600 gap-2 select-none"
                              title="Modo Administrador: votação disponível apenas para visualização"
                            >
                              <span className="flex items-center gap-1 text-slate-500">
                                <ThumbsUp className="w-3.5 h-3.5 text-slate-400" />
                                <span className="font-bold text-slate-800">
                                  {score > 0 ? `+${score}` : score}
                                </span>
                                <span>votos</span>
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-600 font-medium">
                                Apenas leitura
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 shadow-2xs">
                              <button
                                onClick={() => handleVote(idea.id, 1)}
                                className={`p-1.5 rounded-lg transition-all flex items-center gap-1 text-xs font-bold cursor-pointer ${
                                  userVote === 1
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50'
                                }`}
                                title="Apoiar ideia (+1)"
                              >
                                <ThumbsUp className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Apoiar</span>
                              </button>

                              <span
                                className={`px-2.5 text-xs font-extrabold ${
                                  score > 0
                                    ? 'text-emerald-700'
                                    : score < 0
                                    ? 'text-rose-600'
                                    : 'text-slate-500'
                                }`}
                              >
                                {score > 0 ? `+${score}` : score}
                              </span>

                              <button
                                onClick={() => handleVote(idea.id, -1)}
                                className={`p-1.5 rounded-lg transition-all flex items-center gap-1 text-xs font-bold cursor-pointer ${
                                  userVote === -1
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-rose-600 hover:bg-rose-50'
                                }`}
                                title="Discordar (-1)"
                              >
                                <ThumbsDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )
                        ) : (
                          <div className="text-xs text-slate-500 font-semibold px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-1">
                            <span className="text-slate-800 font-bold">{score}</span> votos consolidados
                          </div>
                        )}
                      </div>

                      {/* Botão Ver Detalhes */}
                      <button
                        onClick={() => setSelectedIdeaDetailsId(idea.id)}
                        className="px-3.5 py-2 text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-xl transition-colors flex items-center gap-1.5 ml-auto sm:ml-0 cursor-pointer"
                      >
                        <span>Ver Detalhes</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredIdeas.length === 0 && (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-xs">
                <Lightbulb className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800">
                  {statusTab === 'disponiveis' && 'Nenhuma ideia em votação aberta'}
                  {statusTab === 'desenvolvimento' && 'Nenhuma demanda em desenvolvimento ou análise'}
                  {statusTab === 'entregues' && 'Nenhuma demanda entregue neste filtro'}
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Tente alterar seus termos de busca ou filtros de sistema/setor.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: NEW IDEA FORM (renderNewIdeaForm) */}
        {activeTab === 'new-idea' && (
          <div className="max-w-3xl mx-auto bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xl shadow-emerald-950/5">
            <div className="border-b border-slate-100 pb-5 mb-6">
              <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-1">
                <Lightbulb className="w-4 h-4" />
                <span>Nova Demanda</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                Conte-nos sobre o gargalo que trava a sua operação...
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                Quanto mais detalhes você compartilhar conosco sobre as suas dores e até planilhas que são necessárias para garantir o seu dia, mais rápida e assertiva será a solução no ERP.
              </p>
            </div>

            <form id="new-idea-form" onSubmit={handleCreateIdea} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Título Resumido da Dor/ Necessidade <span className="text-emerald-600">*</span>
                </label>
                <input
                  id="form-title"
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Conciliação Automática de Vendas com Carteiras Digitais no SysPDV"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none placeholder-slate-400 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Sistema Alvo <span className="text-emerald-600">*</span>
                  </label>
                  <select
                    id="form-product"
                    value={newProduct}
                    onChange={(e) => setNewProduct(e.target.value as 'Varejofacil' | 'SysPDV')}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none"
                  >
                    <option value="Varejofacil">Varejofacil (Retaguarda / ERP)</option>
                    <option value="SysPDV">SysPDV (Frente de Loja / PDV)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Área / Setor Afetado
                  </label>
                  <select
                    id="form-category"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none"
                  >
                    <option value="Frente de Loja">Frente de Loja & Caixas</option>
                    <option value="Estoque">Estoque & Recebimento</option>
                    <option value="Fiscal">Fiscal & Contabilidade</option>
                    <option value="Financeiro">Financeiro & Tesouraria</option>
                    <option value="Comercial">Comercial & Precificação</option>
                    <option value="Prevenção de Perdas">Prevenção de Perdas</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  1. Qual o gargalo atual na sua operação ? <span className="text-emerald-600">*</span>
                </label>
                <textarea
                  id="form-pain"
                  rows={3}
                  required
                  value={newPain}
                  onChange={(e) => setNewPain(e.target.value)}
                  placeholder="Descreva detalhadamente o que acontece hoje na rotina do supermercado e quanto tempo ou dinheiro é desperdiçado..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none placeholder-slate-400 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  2. Como você soluciona hoje fora do ERP? (Planilhas, contornos, rotinas manuais) <span className="text-emerald-600">*</span>
                </label>
                <textarea
                  id="form-workaround"
                  rows={3}
                  required
                  value={newWorkaround}
                  onChange={(e) => setNewWorkaround(e.target.value)}
                  placeholder="Ex: Fazemos anotações no caderno, exportamos para Excel, usamos um sistema paralelo de terceiro, etc."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none placeholder-slate-400 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  3. Insumos e Evidências (PDFs, Planilhas Excel, Telas)
                </label>
                <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 text-center bg-slate-50/70 hover:bg-emerald-50/30 transition-all">
                  <FileText className="w-8 h-8 text-emerald-600/70 mx-auto mb-2" />
                  <p className="text-xs text-slate-700 font-semibold">
                    Arraste arquivos ou clique para selecionar
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Formatos: .xlsx, .csv, .pdf, .png, .jpg (Até 15MB)
                  </p>
                  <input
                    type="file"
                    id="input-new-files"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) {
                        setNewFiles(Array.from(e.target.files));
                      }
                    }}
                  />
                  <label
                    htmlFor="input-new-files"
                    className="mt-3.5 inline-block px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-xs"
                  >
                    Escolher Arquivos do Computador
                  </label>
                </div>

                {newFiles.length > 0 && (
                  <div id="new-files-preview" className="mt-3 space-y-1.5">
                    {newFiles.map((f) => (
                      <div
                        key={f.name}
                        className="flex items-center justify-between px-3.5 py-2 bg-emerald-50/60 rounded-xl text-xs border border-emerald-100"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Paperclip className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-slate-800 font-medium truncate">{f.name}</span>
                          <span className="text-slate-500 text-[10px]">
                            ({(f.size / 1024).toFixed(0)} KB)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('board')}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Submeter para Avaliação</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 3: ADMIN REVIEW (renderAdminReview) */}
        {activeTab === 'admin-review' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs">
              <div className="flex items-center gap-2 text-teal-700 text-xs font-bold uppercase tracking-wider mb-1">
                <Shield className="w-4 h-4" />
                <span>Painel de Curadoria Casa Magalhães</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                Fila de Triagem & Agrupamento de Demandas
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Valide as dores submetidas antes de liberá-las para votação. Você pode <strong>aprovar</strong>, <strong>recusar</strong> ou <strong>agrupar</strong> com ideias idênticas.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <span>Ideias Aguardando Curadoria</span>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                  {ideas.filter((i) => i.status === 'pending_review').length}
                </span>
              </h3>

              {ideas.filter((i) => i.status === 'pending_review').length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400 text-xs">
                  Não há novas ideias pendentes de triagem no momento. Fila zerada!
                </div>
              ) : (
                ideas
                  .filter((i) => i.status === 'pending_review')
                  .map((idea) => (
                    <div
                      key={idea.id}
                      className="bg-white border border-amber-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                              {idea.product}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">
                              Enviado por <strong>{idea.authorName}</strong> ({idea.company}) em {idea.createdAt}
                            </span>
                          </div>
                          <h4 className="text-base font-bold text-slate-900">{idea.title}</h4>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => approveIdea(idea.id)}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                            <span>Aprovar para Votação</span>
                          </button>

                          <button
                            onClick={() => setIdeaToMergeId(idea.id)}
                            className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                          >
                            <Layers className="w-4 h-4" />
                            <span>Agrupar...</span>
                          </button>

                          <button
                            onClick={() => rejectIdea(idea.id)}
                            className="px-3 py-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 border border-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                            <span>Recusar</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs">
                        <div>
                          <span className="font-bold text-rose-600 block mb-1">Dor Operacional Relatada:</span>
                          <p className="text-slate-700 leading-relaxed">{idea.painDescription}</p>
                        </div>
                        <div>
                          <span className="font-bold text-amber-700 block mb-1">Como Contorna Hoje (Sem ERP):</span>
                          <p className="text-slate-700 leading-relaxed italic">&quot;{idea.currentWorkaround}&quot;</p>
                        </div>
                      </div>

                      {idea.attachments && idea.attachments.length > 0 && (
                        <div className="flex items-center gap-2 text-xs text-slate-600 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                          <Paperclip className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="font-semibold text-emerald-900">Insumos Anexados:</span>
                          {idea.attachments.map((att) => (
                            <span key={att.name} className="text-emerald-700 underline font-medium">
                              {att.name} ({att.size})
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
              )}
            </div>
          </div>
        )}

        {/* TAB 4: PRIORITIZATION (renderPrioritization) */}
        {activeTab === 'prioritization' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs">
              <div className="flex items-center gap-2 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-1">
                <TrendingUp className="w-4 h-4" />
                <span>Gestão de Ciclos & Roadmap P&D</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                Priorização das Ideias Mais Votadas ({activeCycle})
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Ao final da votação, a equipe de produto Casa Magalhães seleciona as demandas campeãs para entrar na esteira de desenvolvimento do <strong>Varejofacil</strong> e <strong>SysPDV</strong>.
              </p>
            </div>

            {/* Tabela de Ranking */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center justify-between">
                <span>Ranking de Votação Popular (Em Votação)</span>
                <span className="text-xs text-slate-500 font-normal">
                  Total de {ideas.filter((i) => i.status === 'voting').length} demanda(s) disputando vaga no ciclo
                </span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Posição</th>
                      <th className="py-3 px-4">Sistema</th>
                      <th className="py-3 px-4">Título da Demanda</th>
                      <th className="py-3 px-4 text-center">Score Líquido</th>
                      <th className="py-3 px-4">Evidências / Insumos</th>
                      <th className="py-3 px-4 text-right">Ação de Ciclo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ideas
                      .filter((i) => i.status === 'voting')
                      .sort((a, b) => calculateScore(b.votes) - calculateScore(a.votes))
                      .map((item, index) => {
                        const score = calculateScore(item.votes);
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-slate-700">
                              #{index + 1}
                              {index === 0 && (
                                <span className="ml-1.5 text-amber-500 font-extrabold">★ 1º</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`px-2.5 py-0.5 rounded-full font-bold ${
                                  item.product === 'SysPDV'
                                    ? 'bg-teal-50 text-teal-800 border border-teal-200'
                                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                }`}
                              >
                                {item.product}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-800">{item.title}</div>
                              <div className="text-[11px] text-slate-500 truncate max-w-sm">
                                {item.painDescription}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span
                                className={`font-bold px-3 py-1 rounded-full text-xs ${
                                  score > 0
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {score > 0 ? `+${score}` : score}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-slate-500">
                              {item.attachments.length > 0 ? (
                                <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                                  <Paperclip className="w-3.5 h-3.5" />
                                  {item.attachments.length} arquivo(s)
                                </span>
                              ) : (
                                'Sem anexos'
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={() => movePipeline(item.id, 'in_immersion')}
                                className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold shadow-sm flex items-center gap-1.5 ml-auto transition-all text-xs cursor-pointer"
                              >
                                <Kanban className="w-3.5 h-3.5" />
                                <span>Mover P/Imersão</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Esteira Progressiva */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>Esteira Contínua de Evolução de Produto (P&D)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Avance as demandas progressivamente pelas etapas até o fechamento com a identificação da Build oficial liberada.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Em Imersão */}
                <div className="bg-sky-50/40 border border-sky-200/80 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-sky-900 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                        <span>Em Imersão</span>
                      </span>
                      <span className="px-2 py-0.5 bg-sky-100 text-sky-800 text-[10px] font-extrabold rounded-full">
                        {ideas.filter((i) => i.status === 'in_immersion').length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {ideas
                        .filter((i) => i.status === 'in_immersion')
                        .map((item) => (
                          <div
                            key={item.id}
                            className="bg-white p-3 rounded-xl border border-sky-100 shadow-2xs space-y-2"
                          >
                            <div className="text-xs font-bold text-slate-800 leading-snug">{item.title}</div>
                            <div className="text-[10px] text-slate-500">{item.product} • {item.category}</div>
                            <button
                              onClick={() => movePipeline(item.id, 'in_development')}
                              className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                            >
                              <span>Mover P/Desenvolvimento</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      {ideas.filter((i) => i.status === 'in_immersion').length === 0 && (
                        <div className="text-[11px] text-slate-400 text-center py-6">Nenhum item em imersão</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Em Desenvolvimento */}
                <div className="bg-indigo-50/40 border border-indigo-200/80 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Em Desenvolvimento</span>
                      </span>
                      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-extrabold rounded-full">
                        {ideas.filter((i) => i.status === 'in_development').length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {ideas
                        .filter((i) => i.status === 'in_development')
                        .map((item) => (
                          <div
                            key={item.id}
                            className="bg-white p-3 rounded-xl border border-indigo-100 shadow-2xs space-y-2"
                          >
                            <div className="text-xs font-bold text-slate-800 leading-snug">{item.title}</div>
                            <div className="text-[10px] text-slate-500">{item.product} • {item.category}</div>
                            <button
                              onClick={() => movePipeline(item.id, 'in_validation')}
                              className="w-full py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                            >
                              <span>Mover P/Validação</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      {ideas.filter((i) => i.status === 'in_development').length === 0 && (
                        <div className="text-[11px] text-slate-400 text-center py-6">Nenhum item em desenvolvimento</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. Em Validação */}
                <div className="bg-purple-50/40 border border-purple-200/80 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-purple-600" />
                        <span>Em Validação</span>
                      </span>
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-extrabold rounded-full">
                        {ideas.filter((i) => i.status === 'in_validation').length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {ideas
                        .filter((i) => i.status === 'in_validation')
                        .map((item) => (
                          <div
                            key={item.id}
                            className="bg-white p-3 rounded-xl border border-purple-100 shadow-2xs space-y-2"
                          >
                            <div className="text-xs font-bold text-slate-800 leading-snug">{item.title}</div>
                            <div className="text-[10px] text-slate-500">{item.product} • {item.category}</div>
                            <button
                              onClick={() => movePipeline(item.id, 'in_pilot')}
                              className="w-full py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                            >
                              <span>Em Piloto</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      {ideas.filter((i) => i.status === 'in_validation').length === 0 && (
                        <div className="text-[11px] text-slate-400 text-center py-6">Nenhum item em validação</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 4. Em Piloto */}
                <div className="bg-amber-50/40 border border-amber-200/80 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-amber-600" />
                        <span>Em Piloto</span>
                      </span>
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-extrabold rounded-full">
                        {ideas.filter((i) => i.status === 'in_pilot').length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {ideas
                        .filter((i) => i.status === 'in_pilot')
                        .map((item) => (
                          <div
                            key={item.id}
                            className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs space-y-2"
                          >
                            <div className="text-xs font-bold text-slate-800 leading-snug">{item.title}</div>
                            <div className="text-[10px] text-slate-500">{item.product} • {item.category}</div>
                            <button
                              onClick={() => {
                                setCompletingIdeaId(item.id);
                                setBuildNumberInput('');
                              }}
                              className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors shadow-xs cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Concluído</span>
                            </button>
                          </div>
                        ))}
                      {ideas.filter((i) => i.status === 'in_pilot').length === 0 && (
                        <div className="text-[11px] text-slate-400 text-center py-6">Nenhum item em piloto</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Entregas Concluídas */}
              <div className="mt-6 bg-teal-50/50 border border-teal-200 rounded-2xl p-5 space-y-3.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-teal-950 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-600" />
                    <span>Entregas Concluídas (Disponíveis no ERP com Versão Oficial)</span>
                  </h4>
                  <span className="text-xs bg-teal-100 text-teal-900 font-bold px-2.5 py-0.5 rounded-full border border-teal-200">
                    {ideas.filter((i) => i.status === 'delivered').length} entrega(s)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {ideas
                    .filter((i) => i.status === 'delivered')
                    .map((item) => (
                      <div
                        key={item.id}
                        className="bg-white p-3.5 rounded-xl border border-teal-200/80 shadow-2xs space-y-1.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-xs font-bold text-slate-800">{item.title}</div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200 shrink-0">
                            {item.product}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">{item.company} • {item.category}</div>
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-medium text-[11px]">Versão liberada:</span>
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-md font-bold text-[11px]">
                            {item.deliveredBuild || 'Build em produção'}
                          </span>
                        </div>
                      </div>
                    ))}
                  {ideas.filter((i) => i.status === 'delivered').length === 0 && (
                    <div className="text-xs text-slate-400 text-center py-4 col-span-2">
                      Nenhuma demanda concluída até o momento.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: USERS (renderUserManagement) */}
        {activeTab === 'users' && user?.role === 'admin' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-teal-700 text-xs font-bold uppercase tracking-wider mb-1">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Administração & Governança CM</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Cadastro e Gestão de Usuários
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Cadastre novos supermercadistas parceiros ou administradores internos, gerencie dados cadastrais, CNPJs e controle o status de acesso.
                </p>
              </div>

              <button
                onClick={() => handleOpenUserModal()}
                className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] shrink-0 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Cadastrar Novo Usuário</span>
              </button>
            </div>

            {/* Filtros de Busca e Status */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por Nome, CNPJ ou E-mail..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition-all"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto">
                <span className="text-xs text-slate-500 font-semibold flex items-center gap-1 pl-1">
                  <Filter className="w-3.5 h-3.5 text-teal-600" /> Status:
                </span>
                <button
                  onClick={() => setUserStatusFilter('TODOS')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    userStatusFilter === 'TODOS'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
                  }`}
                >
                  Todos ({users.length})
                </button>
                <button
                  onClick={() => setUserStatusFilter('active')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    userStatusFilter === 'active'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-emerald-700 hover:bg-emerald-50 border border-slate-200'
                  }`}
                >
                  Ativos ({users.filter((u) => u.status === 'active').length})
                </button>
                <button
                  onClick={() => setUserStatusFilter('inactive')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    userStatusFilter === 'inactive'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-slate-100 text-rose-700 hover:bg-rose-50 border border-slate-200'
                  }`}
                >
                  Inativos ({users.filter((u) => u.status === 'inactive').length})
                </button>
              </div>
            </div>

            {/* Tabela de Usuários */}
            <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-5">Nome do Usuário / Loja</th>
                      <th className="py-3.5 px-4">CNPJ do Cliente</th>
                      <th className="py-3.5 px-4">E-mail Corporativo</th>
                      <th className="py-3.5 px-4">Perfil</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-5 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users
                      .filter((u) => {
                        if (userStatusFilter !== 'TODOS' && u.status !== userStatusFilter) return false;
                        if (userSearchQuery.trim()) {
                          const q = userSearchQuery.toLowerCase();
                          const matchName = (u.name || '').toLowerCase().includes(q);
                          const matchCnpj = (u.cnpj || '').toLowerCase().includes(q);
                          const matchEmail = (u.email || '').toLowerCase().includes(q);
                          if (!matchName && !matchCnpj && !matchEmail) return false;
                        }
                        return true;
                      })
                      .map((u) => (
                        <tr
                          key={u.id}
                          className={`hover:bg-slate-50/70 transition-colors ${
                            u.status === 'inactive' ? 'bg-slate-50/40 text-slate-400' : ''
                          }`}
                        >
                          <td className="py-3.5 px-5">
                            <div
                              className={`font-bold ${
                                u.status === 'inactive' ? 'text-slate-500 line-through' : 'text-slate-900'
                              }`}
                            >
                              {u.name}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              Cadastrado em {u.createdAt || '2026-01-01'}
                            </div>
                          </td>
                          <td
                            className={`py-3.5 px-4 font-mono font-medium ${
                              u.status === 'inactive' ? 'text-slate-400' : 'text-slate-700'
                            }`}
                          >
                            {u.cnpj || '—'}
                          </td>
                          <td className={`py-3.5 px-4 ${u.status === 'inactive' ? 'text-slate-400' : 'text-slate-600'}`}>
                            {u.email}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] border ${
                                u.role === 'admin'
                                  ? 'bg-teal-50 text-teal-800 border-teal-200'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              }`}
                            >
                              {u.role === 'admin' ? 'Administrador CM' : 'Supermercadista'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                u.status === 'active'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  u.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'
                                }`}
                              />
                              <span>{u.status === 'active' ? 'Ativo' : 'Inativo'}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenUserModal(u.id)}
                                className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200 transition-colors cursor-pointer"
                                title="Editar Dados do Usuário"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => toggleUserStatus(u.id)}
                                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors flex items-center gap-1 cursor-pointer ${
                                  u.status === 'active'
                                    ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                }`}
                                title={u.status === 'active' ? 'Desativar este usuário' : 'Reativar este usuário'}
                              >
                                {u.status === 'active' ? (
                                  <UserX className="w-3.5 h-3.5" />
                                ) : (
                                  <UserCheck className="w-3.5 h-3.5" />
                                )}
                                <span>{u.status === 'active' ? 'Inativar' : 'Ativar'}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER (renderFooter) */}
      <footer className="bg-white border-t border-slate-200/80 py-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>Casa Magalhães S/A • Minhas Ideias na CM</div>
          <div className="text-[11px] text-slate-400">
            Conectando a operação de supermercados ao P&D de Varejofacil e SysPDV
          </div>
        </div>
      </footer>

      {/* DETAILS DRAWER (renderDetailsDrawer) */}
      {selectedIdeaDetails && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity cursor-pointer"
            onClick={() => setSelectedIdeaDetailsId(null)}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
            <div className="w-screen max-w-2xl bg-white shadow-2xl border-l border-slate-200 flex flex-col">
              {/* Header */}
              <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-white sticky top-0 z-10">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        selectedIdeaDetails.product === 'SysPDV'
                          ? 'bg-teal-50 text-teal-800 border border-teal-200'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {selectedIdeaDetails.product}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">Ciclo: {selectedIdeaDetails.cycle}</span>
                    <span className="text-xs text-slate-300">•</span>
                    <span className="text-xs text-slate-500 font-medium">Setor: {selectedIdeaDetails.category}</span>
                    {selectedIdeaDetails.deliveredBuild && (
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                        {selectedIdeaDetails.deliveredBuild}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 leading-snug">{selectedIdeaDetails.title}</h3>
                  <div className="text-xs text-slate-500">
                    Cadastrado por <strong className="text-slate-700">{selectedIdeaDetails.authorName}</strong> ({selectedIdeaDetails.company})
                  </div>
                </div>

                <button
                  onClick={() => setSelectedIdeaDetailsId(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 text-xs">
                {/* Dor na Operação */}
                <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-100 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-rose-700 uppercase tracking-wider text-[11px]">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Dor na Operação:</span>
                  </div>
                  <p className="text-slate-700 text-sm leading-relaxed">{selectedIdeaDetails.painDescription}</p>
                </div>

                {/* Como Resolve Hoje */}
                <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-amber-800 uppercase tracking-wider text-[11px]">
                    <Layers className="w-3.5 h-3.5 text-amber-600" />
                    <span>Como Resolve Hoje Sem o ERP (Contorno Operacional):</span>
                  </div>
                  <p className="text-slate-700 text-xs leading-relaxed italic">&quot;{selectedIdeaDetails.currentWorkaround}&quot;</p>
                </div>

                {/* Insumos Anexados */}
                <div>
                  <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                    <Paperclip className="w-4 h-4 text-emerald-600" />
                    <span>Insumos Anexados para Avaliação ({selectedIdeaDetails.attachments.length})</span>
                  </h4>

                  {selectedIdeaDetails.attachments.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {selectedIdeaDetails.attachments.map((att) => (
                        <div
                          key={att.name}
                          className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200/80"
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                            <div className="truncate">
                              <div className="text-slate-800 font-bold truncate">{att.name}</div>
                              <div className="text-[10px] text-slate-500">{att.size}</div>
                            </div>
                          </div>

                          {user?.role === 'admin' ? (
                            <button
                              onClick={() => showToast(`Download simulado de ${att.name}`)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition-colors shadow-xs flex items-center gap-1 cursor-pointer"
                            >
                              <Download className="w-3 h-3" />
                              <span>Baixar</span>
                            </button>
                          ) : (
                            <span
                              title="O download de insumos e arquivos é restrito à equipe administradora Casa Magalhães"
                              className="px-2 py-1 bg-slate-100 text-slate-400 border border-slate-200 rounded-lg text-[10px] font-medium flex items-center gap-1 select-none"
                            >
                              <Lock className="w-3 h-3 text-slate-400" />
                              <span>Restrito ao Admin</span>
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 italic">Nenhum anexo submetido nesta ideia.</p>
                  )}
                </div>

                {/* Votação */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-800">
                      {user?.role === 'admin' ? 'Apoio da Comunidade Varejista:' : 'Sua opinião como parceiro:'}
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      {user?.role === 'admin'
                        ? 'Contagem consolidada de votos para priorização'
                        : 'Essa melhoria também ajudaria a sua loja?'}
                    </div>
                  </div>

                  {user?.role === 'admin' ? (
                    <div className="text-xs font-bold px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-700 flex items-center gap-1.5">
                      <ThumbsUp className="w-3.5 h-3.5 text-slate-500" />
                      <span>{calculateScore(selectedIdeaDetails.votes)} votos (Modo visualização)</span>
                    </div>
                  ) : selectedIdeaDetails.status === 'voting' ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleVote(selectedIdeaDetails.id, 1)}
                        className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          user && selectedIdeaDetails.votes[user.email] === 1
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white text-slate-700 border border-slate-200 hover:text-emerald-700'
                        }`}
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>Sim (+1)</span>
                      </button>

                      <button
                        onClick={() => handleVote(selectedIdeaDetails.id, -1)}
                        className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          user && selectedIdeaDetails.votes[user.email] === -1
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-white text-slate-700 border border-slate-200 hover:text-rose-600'
                        }`}
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                        <span>Não (-1)</span>
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500 font-semibold">Votação encerrada para este item</span>
                  )}
                </div>

                {/* Comentários */}
                <div className="border-t border-slate-100 pt-4 space-y-3">
                  <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-teal-600" />
                    <span>Discussão & Contribuições ({selectedIdeaDetails.comments.length})</span>
                  </h4>

                  <div className="space-y-2.5">
                    {selectedIdeaDetails.comments.map((comm) => (
                      <div key={comm.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-800">{comm.userName}</span>
                          <span className="text-slate-400">{comm.date}</span>
                        </div>
                        <p className="text-slate-700 leading-relaxed">{comm.text}</p>
                        {comm.attachmentName && (
                          <div className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 mt-1">
                            <Paperclip className="w-3 h-3 text-emerald-600" />
                            <span>Anexo complementar: {comm.attachmentName}</span>
                          </div>
                        )}
                      </div>
                    ))}

                    {selectedIdeaDetails.comments.length === 0 && (
                      <p className="text-slate-400 italic text-center py-2">Nenhum comentário até o momento.</p>
                    )}
                  </div>

                  {user?.role !== 'admin' && (
                    <div className="pt-2 space-y-2">
                      <textarea
                        id="details-comment-text"
                        rows={2}
                        value={detailsCommentText}
                        onChange={(e) => setDetailsCommentText(e.target.value)}
                        placeholder="Adicione um relato ou como sua loja contorna essa dor..."
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition-all"
                      />

                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-emerald-700 cursor-pointer font-medium">
                          <Paperclip className="w-3.5 h-3.5" />
                          <span>{detailsCommentFile || 'Anexar documento auxiliar'}</span>
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                setDetailsCommentFile(e.target.files[0].name);
                              }
                            }}
                          />
                        </label>

                        <button
                          onClick={() => {
                            handleAddComment(selectedIdeaDetails.id, detailsCommentText, detailsCommentFile);
                            setDetailsCommentText('');
                            setDetailsCommentFile(null);
                          }}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                        >
                          <Send className="w-3 h-3" />
                          <span>Enviar</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COMMENTS DRAWER (renderCommentsDrawer) */}
      {commentsDrawerIdea && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity cursor-pointer"
            onClick={() => setCommentsDrawerIdeaId(null)}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md sm:max-w-lg bg-white shadow-2xl border-l border-slate-200 flex flex-col">
              {/* Topo */}
              <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-3 bg-white sticky top-0 z-10">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        commentsDrawerIdea.product === 'SysPDV'
                          ? 'bg-teal-50 text-teal-800 border-teal-200'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}
                    >
                      {commentsDrawerIdea.product}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">{commentsDrawerIdea.category}</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 line-clamp-2 leading-snug">
                    {commentsDrawerIdea.title}
                  </h3>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <MessageSquare className="w-3 h-3 text-emerald-600" />
                    <span className="font-semibold text-slate-700">{commentsDrawerIdea.comments.length}</span>
                    <span>contribuição(ões) registradas</span>
                  </div>
                </div>

                <button
                  onClick={() => setCommentsDrawerIdeaId(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Lista de Comentários */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
                {commentsDrawerIdea.comments.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700">Nenhum comentário ainda</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs">
                      {user?.role === 'admin'
                        ? 'Os supermercadistas parceiros ainda não adicionaram comentários nesta demanda.'
                        : 'Sua loja também passa por esse gargalo? Compartilhe como vocês contornam ou adicione insumos complementares abaixo.'}
                    </p>
                  </div>
                ) : (
                  commentsDrawerIdea.comments.map((comm) => (
                    <div
                      key={comm.id}
                      className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/70 space-y-1.5 hover:border-emerald-200 transition-colors"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-800">{comm.userName}</span>
                        <span className="text-slate-400">{comm.date}</span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{comm.text}</p>
                      {comm.attachmentName && (
                        <div className="inline-flex items-center gap-1.5 text-[10px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200/70 px-2 py-1 rounded-lg mt-1">
                          <Paperclip className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span className="truncate max-w-xs">Anexo: {comm.attachmentName}</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Formulário de Comentário */}
              <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-2.5">
                {user?.role === 'admin' ? (
                  <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-center">
                    <p className="text-xs font-semibold text-amber-900">
                      Modo Administrador: Apenas visualização de comentários
                    </p>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      A publicação de comentários é restrita à comunidade de supermercadistas.
                    </p>
                  </div>
                ) : (
                  <>
                    <textarea
                      id="drawer-comment-text"
                      rows={3}
                      value={drawerCommentText}
                      onChange={(e) => setDrawerCommentText(e.target.value)}
                      placeholder="Conte como essa dor afeta sua loja ou compartilhe sua experiência..."
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all shadow-2xs resize-none"
                    />

                    <div className="flex items-center justify-between gap-2">
                      <label className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-emerald-700 cursor-pointer font-medium truncate max-w-[220px]">
                        <Paperclip className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">{drawerCommentFile || 'Anexar documento auxiliar'}</span>
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setDrawerCommentFile(e.target.files[0].name);
                            }
                          }}
                        />
                      </label>

                      <button
                        onClick={() => {
                          handleAddComment(commentsDrawerIdea.id, drawerCommentText, drawerCommentFile);
                          setDrawerCommentText('');
                          setDrawerCommentFile(null);
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 shrink-0 cursor-pointer"
                      >
                        <Send className="w-3 h-3" />
                        <span>Publicar</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MERGE MODAL (renderMergeModal) */}
      {ideaToMerge && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-600" />
                <span>Agrupar Ideia a Demanda Existente</span>
              </h3>
              <button
                onClick={() => setIdeaToMergeId(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Você está agrupando: <strong className="text-slate-900">&quot;{ideaToMerge.title}&quot;</strong>.
              Escolha a demanda principal que representará essa dor no catálogo:
            </p>

            <select
              id="select-merge-target"
              value={mergeTargetId}
              onChange={(e) => setMergeTargetId(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
            >
              <option value="">Selecione a demanda destino...</option>
              {ideas
                .filter((i) => i.id !== ideaToMerge.id && i.status !== 'merged')
                .map((i) => (
                  <option key={i.id} value={i.id}>
                    [{i.product}] {i.title}
                  </option>
                ))}
            </select>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setIdeaToMergeId(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={executeMerge}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer"
              >
                Confirmar Agrupamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPLETE MODAL (renderCompleteModal) */}
      {completingIdea && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Concluir Demanda e Informar Build</span>
              </h3>
              <button
                onClick={() => setCompletingIdeaId(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Você está finalizando a demanda <strong className="text-slate-900">&quot;{completingIdea.title}&quot;</strong> ({completingIdea.product}).
              Por favor, informe a versão/Build em que o pacote oficial foi liberado para os clientes:
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Número da Build / Versão Liberada <span className="text-emerald-600">*</span>
              </label>
              <input
                id="input-build-number"
                type="text"
                autoFocus
                required
                value={buildNumberInput}
                onChange={(e) => setBuildNumberInput(e.target.value)}
                placeholder="Ex: Build 2026.2.4 ou v26.12.01"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition-all font-medium"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Esta informação ficará visível na Aba Entregues para todos os supermercadistas.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setCompletingIdeaId(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => confirmDelivery(completingIdea.id, buildNumberInput)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Confirmar Conclusão</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* USER MODAL (renderUserModal) */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-200">
                  {editingUserId ? <Pencil className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingUserId ? 'Editar Usuário' : 'Cadastrar Novo Usuário'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {editingUserId
                      ? 'Atualize as credenciais e status cadastrais'
                      : 'Preencha os dados cadastrais solicitados para liberar acesso'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseUserModal}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form id="user-form" onSubmit={handleSaveUser} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nome do Usuário / Razão Social <span className="text-emerald-600">*</span>
                </label>
                <input
                  id="modal-user-name"
                  type="text"
                  required
                  value={modalUserName}
                  onChange={(e) => setModalUserName(e.target.value)}
                  placeholder="Ex: Carlos Oliveira ou Supermercado Alvorada"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  CNPJ do Cliente <span className="text-emerald-600">*</span>
                </label>
                <input
                  id="modal-user-cnpj"
                  type="text"
                  required
                  maxLength={18}
                  value={modalUserCnpj}
                  onChange={(e) => handleCnpjMask(e.target.value)}
                  placeholder="00.000.000/0000-00"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition-all"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Identificação única do parceiro supermercadista.
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  E-mail Corporativo <span className="text-emerald-600">*</span>
                </label>
                <input
                  id="modal-user-email"
                  type="email"
                  required
                  value={modalUserEmail}
                  onChange={(e) => setModalUserEmail(e.target.value)}
                  placeholder="usuario@supermercado.com.br"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Perfil de Acesso <span className="text-emerald-600">*</span>
                  </label>
                  <select
                    id="modal-user-role"
                    value={modalUserRole}
                    onChange={(e) => setModalUserRole(e.target.value as 'admin' | 'user')}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none"
                  >
                    <option value="user">Supermercadista (Cliente)</option>
                    <option value="admin">Administrador CM</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Status do Usuário <span className="text-emerald-600">*</span>
                  </label>
                  <select
                    id="modal-user-status"
                    value={modalUserStatus}
                    onChange={(e) => setModalUserStatus(e.target.value as 'active' | 'inactive')}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none"
                  >
                    <option value="active">Ativo (Acesso Liberado)</option>
                    <option value="inactive">Inativo (Acesso Bloqueado)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseUserModal}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-md shadow-emerald-600/20 text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingUserId ? 'Salvar Alterações' : 'Cadastrar Usuário'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
