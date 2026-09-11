import { Idea } from '@/types/idea';

export const INITIAL_IDEAS: Idea[] = [
  {
    id: 'ideia-101',
    title: 'Controle de Ruptura de Gôndola em Tempo Real via SysPDV',
    product: 'SysPDV',
    category: 'Frente de Loja',
    company: 'Supermercado Central de Fortaleza',
    authorName: 'Carlos Silveira',
    authorEmail: 'usuario@cm.com.br',
    createdAt: '2026-08-20',
    cycle: 'Ciclo 2026.2',
    painDescription: 'Quando um item zera no PDV após sucessivas vendas, os repositores demoram até 4 horas para perceber que a gôndola está vazia, gerando perda imediata de vendas.',
    currentWorkaround: 'Hoje usamos um grupo de WhatsApp onde os fiscais de caixa tiram fotos das gôndolas e anotam em pranchetas de papel para avisar o líder do depósito.',
    attachments: [
      { name: 'fluxo_whatsapp_ruptura.pdf', size: '1.4 MB' },
      { name: 'planilha_perda_ruptura.xlsx', size: '480 KB' }
    ],
    status: 'voting',
    votes: {
      'usuario@cm.com.br': 1,
      'super_nordeste@cm.com.br': 1,
      'rede_bompreco@cm.com.br': 1,
      'varejo_ce@cm.com.br': -1
    },
    comments: [
      {
        id: 'c1',
        userName: 'Mariana Lima (Super Líder)',
        userEmail: 'mariana@superlider.com.br',
        text: 'Essa dor é crítica! Sofremos muito no setor de hortifrúti aos sábados.',
        date: '2026-08-22',
        attachmentName: 'relatorio_sabado.pdf'
      }
    ]
  },
  {
    id: 'ideia-102',
    title: 'Importação Automática de XML de Devolução de Mercadoria com Cruzamento de NF',
    product: 'Varejofacil',
    category: 'Fiscal',
    company: 'Hipermercado Atlântico',
    authorName: 'Fernanda Rocha',
    authorEmail: 'fernanda@atlantico.com.br',
    createdAt: '2026-08-24',
    cycle: 'Ciclo 2026.2',
    painDescription: 'No Varejofacil, a devolução de troca de clientes corporativos e fornecedores exige digitação manual de 44 dígitos da chave de acesso e verificação manual item a item com a nota de saída.',
    currentWorkaround: 'Usamos uma planilha com macros no Excel para comparar o DANFE gerado com o espelho da saída antes de lançar no ERP.',
    attachments: [
      { name: 'macro_comparador_chaves.xlsm', size: '2.1 MB' }
    ],
    status: 'voting',
    votes: {
      'usuario@cm.com.br': 1,
      'cliente_a@cm.com.br': 1,
      'cliente_b@cm.com.br': 1,
      'cliente_c@cm.com.br': 1,
      'cliente_d@cm.com.br': 1
    },
    comments: []
  },
  {
    id: 'ideia-103',
    title: 'Sangria Cega com Fechamento Dinâmico de Lote PIX no SysPDV PDV',
    product: 'SysPDV',
    category: 'Financeiro',
    company: 'Supermercado Bom Demais',
    authorName: 'Roberto Alves',
    authorEmail: 'usuario@cm.com.br',
    createdAt: '2026-08-28',
    cycle: 'Ciclo 2026.2',
    painDescription: 'Operadores de caixa conseguem ver o saldo em dinheiro e PIX antes da sangria, aumentando divergências no fechamento de turno.',
    currentWorkaround: 'O fiscal imprime o cupom de leitura X, dobra e grampeia em um envelope lacrado que só o tesoureiro confere horas depois.',
    attachments: [
      { name: 'procedimento_envelope_cego.pdf', size: '890 KB' }
    ],
    status: 'pending_review',
    votes: {},
    comments: []
  },
  {
    id: 'ideia-104',
    title: 'Precificação Inteligente e Margem Dinâmica por Curva ABC',
    product: 'Varejofacil',
    category: 'Comercial',
    company: 'Rede Super Giro',
    authorName: 'Juliana Mendes',
    authorEmail: 'juliana@supergiro.com.br',
    createdAt: '2026-07-15',
    cycle: 'Ciclo 2026.1',
    painDescription: 'Alterar preços de produtos da curva A considerando o custo médio ponderado e a margem praticada pela concorrência cadastrada.',
    currentWorkaround: 'Exportamos dados do Varejofacil para PowerBI, recalculamos e subimos de volta via carga de arquivo texto.',
    attachments: [
      { name: 'modelo_precificacao_bi.pbix', size: '5.2 MB' }
    ],
    status: 'in_development',
    votes: {
      'usuario@cm.com.br': 1,
      'rede_a@cm.com.br': 1,
      'rede_b@cm.com.br': 1
    },
    comments: []
  },
  {
    id: 'ideia-105',
    title: 'Impressão de Etiquetas de Validade Próxima com Código 2D Databar',
    product: 'Varejofacil',
    category: 'Prevenção de Perdas',
    company: 'Supermercado Modelo',
    authorName: 'Lucas Castro',
    authorEmail: 'lucas@modelo.com.br',
    createdAt: '2026-06-10',
    cycle: 'Ciclo 2026.1',
    painDescription: 'Itens perto do vencimento precisam de desconto automático no leitor do SysPDV sem necessitar que o caixa chame o fiscal.',
    currentWorkaround: 'Colamos etiquetas adesivas amarelas manuais e o operador digita código de desconto especial 9999.',
    attachments: [],
    status: 'delivered',
    deliveredBuild: 'Build 2026.2.1-Hotfix',
    votes: {
      'usuario@cm.com.br': 1,
      'super_ceara@cm.com.br': 1
    },
    comments: []
  }
];
