export interface Attachment {
  name: string;
  size: string;
  url?: string;
}

export interface Comment {
  id: string;
  userName: string;
  userEmail: string;
  text: string;
  date: string;
  attachmentName?: string | null;
}

export type IdeaStatus =
  | 'pending_review'
  | 'voting'
  | 'in_immersion'
  | 'in_development'
  | 'in_validation'
  | 'in_pilot'
  | 'delivered'
  | 'merged'
  | 'rejected';

export interface Idea {
  id: string;
  title: string;
  product: 'Varejofacil' | 'SysPDV';
  category: string;
  company: string;
  authorName: string;
  authorEmail: string;
  createdAt: string;
  cycle: string;
  painDescription: string;
  currentWorkaround: string;
  attachments: Attachment[];
  status: IdeaStatus;
  deliveredBuild?: string;
  mergedIntoId?: string;
  votes: Record<string, number>;
  comments: Comment[];
  fromSupabase?: boolean;
  userId?: string;
}
