export interface Tag {
  id: number;
  name: string;
}

export interface Response {
  id: number;
  description: string;
  created_at: string;
  author: string;
}

export interface Update {
  id: number;
  description: string;
  created_at: string;
  author?: string | null;
}

export enum PetitionStatus {
  New = 0,
  Published = 1,
  Removed = 2,
  NeedsReview = 3,
  Returned = 4,
}

export interface Petition {
  id: number;
  title: string;
  description: string;
  tags: Tag[];
  author: string;
  authorId?: string;
  signatures: number;
  targetSignatures: number;
  tier: number;
  created_at: string;
  status: PetitionStatus;
  expires: string;
  last_signed: string | null;
  has_response: boolean;
  response: Response | null;
  in_progress: boolean | null;
  updates: Update[];
  old_id: string | null;
}
