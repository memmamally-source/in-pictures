/**
 * Core data model. Everything here is plain JSON (no class instances, no
 * blobs) so projects can be stored in IndexedDB today and synced to
 * Firestore later without a migration. Photo pixels live separately in the
 * blob store, keyed by photo id.
 */

export type ThemeId = 'minimal' | 'scrapbook' | 'polaroid' | 'romantic' | 'travel' | 'heritage';
export type GroupType = 'solo' | 'couple' | 'family' | 'friends' | 'group';
export type Mood = 'joyful' | 'romantic' | 'calm' | 'adventurous' | 'nostalgic' | 'elegant' | 'playful';
export type AlbumLength = 'short' | 'standard' | 'long';
export type StartMode = 'plan' | 'have-photos';
export type ProjectStep = 'plan' | 'photos' | 'style' | 'album';

/** Checklist groups shown to the user. */
export type ShotCategory = 'places' | 'people' | 'food' | 'details' | 'moments';

export interface Answers {
  title: string;
  location?: string;
  startDate?: string; // yyyy-mm-dd
  endDate?: string; // yyyy-mm-dd (range occasions)
  /** Used when no dates are given for a multi-day occasion. */
  days?: number;
  group: GroupType;
  participants: number;
  names: string[];
  /** The person/pet/couple the occasion is about, if the user named them. */
  honoree?: string;
  children: boolean;
  mood: Mood;
  length: AlbumLength;
  mode: StartMode;
  /** An optional line for the closing page, written by the user. */
  closingNote?: string;
  /** Occasion-specific answers (see OccasionDef.questions.extras). */
  extras: Record<string, string | boolean>;
}

export interface PlanItem {
  id: string;
  title: string;
  hint?: string;
  category: ShotCategory;
  /** Album chapter this shot belongs to. */
  chapter: string;
  /** Recommended number of photos. */
  target: number;
  skipped?: boolean;
  /** Ticked by hand (e.g. "took it on my camera"), independent of attached photos. */
  done?: boolean;
  custom?: boolean;
  /** Library shot id it came from (absent for custom prompts). */
  shotId?: string;
}

export interface Chapter {
  id: string;
  title: string;
  /** Closing chapters stay last when unsorted photos are slotted in. */
  ending?: boolean;
}

export interface Photo {
  id: string;
  projectId: string;
  name: string;
  /** Size of the stored export-quality image (already turned upright). */
  width: number;
  height: number;
  /** Size of the file the user picked, for resolution warnings. */
  originalWidth: number;
  originalHeight: number;
  takenAt?: string; // local ISO from EXIF, when present
  addedAt: number;
  order: number;
  caption?: string;
  favourite: boolean;
  planItemId?: string;
  chapter?: string;
}

export interface Focal {
  x: number; // 0..1 point of the photo kept in view
  y: number;
  zoom: number; // >= 1
}

export interface PhotoSlot {
  photoId: string | null;
  focal?: Focal;
}

export interface AlbumPage {
  id: string;
  layoutId: string;
  photos: PhotoSlot[];
  /** Text by role key ('title', 'subtitle', 'heading', 'date', 'body', 'names', 'note'). */
  text: Record<string, string>;
  chapterId?: string;
  /** Set once the user changes the page by hand. */
  edited?: boolean;
}

export interface Album {
  pages: AlbumPage[];
  seed: number;
  generatedAt: number;
}

export interface Project {
  id: string;
  schemaVersion: 1;
  occasionId: string;
  answers: Answers;
  plan: PlanItem[];
  chapters: Chapter[];
  themeId: ThemeId;
  coverPhotoId?: string;
  album?: Album;
  step: ProjectStep;
  createdAt: number;
  updatedAt: number;
}
