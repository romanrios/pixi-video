export interface Preset {
  id: string;
  title: string;
  description?: string;
  code: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPicture?: string | null;
  createdAt?: string;
  updatedAt?: string;
  canManage?: boolean;
  isOwner?: boolean;
}

export interface PresetSeed {
  id: string;
  title: string;
  description: string;
  code: string;
}

export interface PresetCreateInput {
  title: string;
  description?: string;
  code: string;
}

export interface PresetUpdateInput {
  title?: string;
  description?: string;
  code?: string;
}

