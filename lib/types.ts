export type ColumnId = 'new' | 'current' | 'support' | 'financial';

export type ColorStatus = 'white' | 'red' | 'yellow' | 'green';

export type Profile = {
  id: string;
  email: string | null;
  name?: string | null;
  role?: 'admin' | 'member';
};

export type Project = {
  id: string;
  title: string;
  description: string | null;
  column: ColumnId;
  color_status: ColorStatus;
  deadline: string | null;
  assigned_user_id: string | null;
  pinned: boolean;
  link: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type Task = {
  id: string;
  project_id: string;
  text: string;
  done: boolean;
  sort_order: number;
  assigned_user_id?: string | null;
  created_at: string;
};

export type UserSettings = {
  user_id: string;
  due_soon_days: number;
};

export type AppSettings = {
  id: number;
  allow_all_edits: boolean;
};
