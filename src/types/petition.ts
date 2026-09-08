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

export type ReviewDecision = "APPROVE" | "CHANGES_REQUESTED";

/** The minimum a reviewer needs to be rendered in a timeline or a chip. */
export interface ReviewerRef {
  id: string;
  name: string;
  email?: string | null;
}

export interface PetitionReviewEntry {
  id: number;
  stage: number;
  decision: ReviewDecision;
  comment: string | null;
  created_at: string;
  reviewer: ReviewerRef;
}

export interface PetitionAssignmentEntry {
  id: number;
  stage: number;
  created_at: string;
  assignee: ReviewerRef;
  assignedBy: ReviewerRef | null;
}

export type ReviewEventType = "ASSIGNED" | "UNASSIGNED";

/** Assignment history. Append-only, so removals survive in the timeline. */
export interface PetitionReviewEventEntry {
  id: number;
  type: ReviewEventType;
  stage: number;
  created_at: string;
  actor: ReviewerRef | null;
  subject: ReviewerRef;
}

export interface Petition {
  id: number;
  title: string;
  description: string;
  tags: Tag[];
  author: string;
  authorEmail?: string;
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

  // Only loaded on the review screens; list views leave these undefined.
  review_stage?: number;
  reviews?: PetitionReviewEntry[];
  assignments?: PetitionAssignmentEntry[];
  review_events?: PetitionReviewEventEntry[];
}
