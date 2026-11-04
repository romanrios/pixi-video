export interface Preset {
  id: string;
  title: string;
  description?: string;
  code: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPicture?: string | null;
  thumbnailUrl?: string | null;
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
  thumbnailUrl?: string;
}

export interface PresetCreateInput {
  title: string;
  description?: string;
  code: string;
  thumbnail?: string | null;
}

export interface PresetUpdateInput {
  title?: string;
  description?: string;
  code?: string;
  thumbnail?: string | null;
}

