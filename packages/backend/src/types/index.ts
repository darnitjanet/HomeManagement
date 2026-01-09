import { Request } from 'express';

// Extend Express Request to include session data
declare module 'express-session' {
  interface SessionData {
    userId?: string;
    googleTokens?: {
      access_token: string;
      refresh_token?: string;
      expiry_date?: number;
      token_type: string;
      scope: string;
    };
  }
}

// Calendar Types
export interface CalendarEvent {
  id: string;
  calendarId: string;
  summary: string;
  description?: string;
  location?: string;
  startDateTime: string;
  endDateTime: string;
  allDay: boolean;
  recurrence?: string;
  attendees?: string;
  status?: string;
  rawData?: string;
}

export interface CalendarConfig {
  id: number;
  calendarId: string;
  calendarName: string;
  calendarType: 'primary' | 'subscribed' | 'external';
  isEnabled: boolean;
  color?: string;
  syncEnabled: boolean;
  lastSyncAt?: string;
  syncToken?: string;
  createdAt: string;
}

export interface ExternalCalendar {
  id: number;
  name: string;
  icalUrl: string;
  color?: string;
  isEnabled: boolean;
  syncInterval: number;
  lastSyncAt?: string;
  syncError?: string;
  createdAt: string;
}

export interface SyncLog {
  id: number;
  calendarId?: string;
  syncType: 'full' | 'incremental' | 'external';
  status: 'success' | 'failed' | 'partial';
  eventsAdded: number;
  eventsUpdated: number;
  eventsDeleted: number;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
}

// Household Items Types
export interface HouseholdItem {
  id: number;
  type: 'book' | 'movie' | 'game' | 'tool' | 'other';
  title: string;
  author?: string;
  isbn?: string;
  location?: string;
  condition?: string;
  purchaseDate?: string;
  notes?: string;
  tags?: string[];
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// API Request/Response Types
export interface AuthenticatedRequest extends Request {
  googleAuth?: any; // Will be the OAuth2 client
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Contact Types
export interface Contact {
  id: number;
  googleContactId: string;
  displayName: string;
  givenName?: string;
  familyName?: string;
  emails?: Array<{ value: string; type?: string }>;
  phones?: Array<{ value: string; type?: string }>;
  photoUrl?: string;
  notes?: string;
  rawData?: string;
  isFavorite: boolean;
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
  tags?: ContactTag[]; // Populated from join
}

export interface ContactTag {
  id: number;
  name: string;
  color: string;
  priority: number;
  createdAt: string;
}

export interface ContactTagAssignment {
  id: number;
  contactId: number;
  tagId: number;
  createdAt: string;
}

export interface ContactSyncLog {
  id: number;
  syncType: 'full' | 'incremental';
  status: 'success' | 'failed' | 'partial';
  contactsAdded: number;
  contactsUpdated: number;
  contactsDeleted: number;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
}

// Movie Types
export interface Movie {
  id: number;
  title: string;
  type: 'Movie' | 'Series' | 'Episode' | 'All';
  watchedStatus: 'Not Watched' | 'Watched';
  imdbId?: string;
  tmdbId?: number;
  starRating?: number; // 0.0-5.0 from API
  myRating?: number; // 1-5 user rating (hearts)
  mpaaRating?: string;
  format?: string;
  genre?: string; // Comma-separated
  plot?: string;
  releaseYear?: string;
  runtime?: string;
  languages?: string; // Comma-separated
  country?: string; // Comma-separated
  awards?: string;
  imdbScore?: string;
  tmdbScore?: string;
  metacriticScore?: string;
  rottenTomatoesScore?: string;
  director?: string;
  actors?: string; // Comma-separated
  writers?: string; // Comma-separated
  productionCompany?: string; // Comma-separated (e.g., "A24, Plan B")
  posterUrl?: string;
  backdropUrl?: string;
  budget?: number;
  revenue?: number;
  personalNotes?: string;
  rawOmdbData?: string; // Full OMDb API response JSON
  rawTmdbData?: string; // Full TMDB API response JSON
  createdAt: string;
  updatedAt: string;
  tags?: MovieTag[]; // Populated from join
}

export interface MovieTag {
  id: number;
  name: string;
  color: string;
  priority: number;
  createdAt: string;
}

export interface MovieTagAssignment {
  id: number;
  movieId: number;
  tagId: number;
  createdAt: string;
}

// OMDb API Response Types
export interface OMDbMovieDetails {
  Title: string;
  Year: string;
  Rated: string;
  Released: string;
  Runtime: string;
  Genre: string;
  Director: string;
  Writer: string;
  Actors: string;
  Plot: string;
  Language: string;
  Country: string;
  Awards: string;
  Poster: string;
  Ratings: Array<{ Source: string; Value: string }>;
  Metascore: string;
  imdbRating: string;
  imdbVotes: string;
  imdbID: string;
  Type: string;
  DVD?: string;
  BoxOffice?: string;
  Production?: string;
  Website?: string;
  Response: string;
}

export interface OMDbSearchResult {
  Title: string;
  Year: string;
  imdbID: string;
  Type: string;
  Poster: string;
}

export interface OMDbSearchResponse {
  Search: OMDbSearchResult[];
  totalResults: string;
  Response: string;
}

// Game Types
export type GameType = 'Board Game' | 'Puzzle' | 'Card Game' | 'Party Game' | 'Video Game';
export type GameCondition = 'Excellent' | 'Good' | 'Fair' | 'Poor';

export interface Game {
  id: number;
  name: string;
  type: GameType;
  playerCountMin?: number;
  playerCountMax?: number;
  condition?: GameCondition;
  platform?: string; // For video games: PS5, Xbox, Switch, PC, etc.
  notes?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
  tags?: GameTag[];
  currentLoan?: GameLoan; // Active loan if any
}

export interface GameLoan {
  id: number;
  gameId: number;
  borrowerName: string;
  borrowerContact?: string;
  loanedDate: string;
  expectedReturnDate?: string;
  returnedDate?: string;
  reminderSent: boolean;
  notes?: string;
  createdAt: string;
}

export interface GameTag {
  id: number;
  name: string;
  color: string;
  priority: number;
  createdAt: string;
}

export interface GameTagAssignment {
  gameId: number;
  tagId: number;
}

export interface CreateGameInput {
  name: string;
  type: GameType;
  playerCountMin?: number;
  playerCountMax?: number;
  condition?: GameCondition;
  platform?: string;
  notes?: string;
  imageUrl?: string;
}

export interface UpdateGameInput {
  name?: string;
  type?: GameType;
  playerCountMin?: number;
  playerCountMax?: number;
  condition?: GameCondition;
  platform?: string;
  notes?: string;
  imageUrl?: string;
}

export interface CreateLoanInput {
  borrowerName: string;
  borrowerContact?: string;
  loanedDate?: string;
  expectedReturnDate?: string;
  notes?: string;
}

// Kid Reward Types
export interface Kid {
  id: number;
  name: string;
  avatarColor: string;
  createdAt: string;
  updatedAt: string;
  stickerCount?: number;
  rewards?: KidReward[];
}

export interface KidSticker {
  id: number;
  kidId: number;
  reason?: string;
  awardedBy?: string;
  awardedAt: string;
}

export interface KidReward {
  id: number;
  kidId: number;
  name: string;
  stickersRequired: number;
  isClaimed: boolean;
  claimedAt?: string;
  createdAt: string;
}

export interface CreateKidInput {
  name: string;
  avatarColor?: string;
}

export interface CreateRewardInput {
  name: string;
  stickersRequired: number;
}

export interface AwardStickerInput {
  reason?: string;
  awardedBy?: string;
}

// Shopping List Types
export type ListType = 'grocery' | 'other';

export type GroceryCategory =
  | 'Produce'
  | 'Dairy'
  | 'Meat & Seafood'
  | 'Bakery'
  | 'Frozen'
  | 'Pantry'
  | 'Beverages'
  | 'Snacks'
  | 'Household'
  | 'Personal Care'
  | 'Other';

export interface ShoppingItem {
  id: number;
  listType: ListType;
  name: string;
  quantity: number;
  category?: GroceryCategory;
  createdAt: string;
}

export interface FavoriteItem {
  id: number;
  listType: ListType;
  name: string;
  category?: GroceryCategory;
  defaultQuantity: number;
  createdAt: string;
}

export interface CreateShoppingItemInput {
  listType: ListType;
  name: string;
  quantity?: number;
  category?: GroceryCategory;
}

export interface CreateFavoriteInput {
  listType: ListType;
  name: string;
  category?: GroceryCategory;
  defaultQuantity?: number;
}

// Recipe Types
export type RecipeDifficulty = 'Easy' | 'Medium' | 'Hard';
export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' | 'Dessert' | 'Appetizer';
export type CuisineType = 'American' | 'Italian' | 'Mexican' | 'Asian' | 'Indian' | 'Mediterranean' | 'French' | 'Other';

export interface Recipe {
  id: number;
  name: string;
  instructions?: string;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  servings?: number;
  cuisine?: CuisineType;
  mealType?: MealType;
  difficulty?: RecipeDifficulty;
  dietary?: string;
  notes?: string;
  imageUrl?: string;
  sourceUrl?: string;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  ingredients?: RecipeIngredient[];
  tags?: RecipeTag[];
}

export interface RecipeIngredient {
  id: number;
  recipeId: number;
  name: string;
  quantity?: number;
  unit?: string;
  preparation?: string;
  optional: boolean;
  sortOrder: number;
}

export interface RecipeTag {
  id: number;
  name: string;
  color: string;
  priority: number;
  createdAt: string;
}

export interface CreateRecipeInput {
  name: string;
  instructions?: string;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  servings?: number;
  cuisine?: CuisineType;
  mealType?: MealType;
  difficulty?: RecipeDifficulty;
  dietary?: string;
  notes?: string;
  imageUrl?: string;
  sourceUrl?: string;
  ingredients?: CreateIngredientInput[];
  tags?: number[];
}

export interface CreateIngredientInput {
  name: string;
  quantity?: number;
  unit?: string;
  preparation?: string;
  optional?: boolean;
  sortOrder?: number;
}

export interface UpdateRecipeInput extends Partial<CreateRecipeInput> {}

// AI Recipe Suggestion Types
export interface RecipeSuggestion {
  name: string;
  description: string;
  cuisine?: string;
  mealType?: string;
  estimatedTime?: string;
  matchedIngredients?: string[];
  missingIngredients?: string[];
}

export interface RecipePreferences {
  cuisine?: string;
  mealType?: string;
  dietary?: string;
  maxTimeMinutes?: number;
  difficulty?: string;
}

// Asset/Inventory Types
export type AssetCategory =
  | 'Electronics'
  | 'Furniture'
  | 'Appliances'
  | 'Jewelry'
  | 'Art'
  | 'Tools'
  | 'Sports & Outdoor'
  | 'Musical Instruments'
  | 'Collectibles'
  | 'Clothing'
  | 'Other';

export type AssetLocation =
  | 'Living Room'
  | 'Kitchen'
  | 'Bedroom'
  | 'Bathroom'
  | 'Office'
  | 'Garage'
  | 'Basement'
  | 'Attic'
  | 'Outdoor'
  | 'Storage'
  | 'Other';

export type AssetCondition = 'Excellent' | 'Good' | 'Fair' | 'Poor';

export type WarrantyType = 'Manufacturer' | 'Extended' | 'Store Protection' | 'Other';

export interface Asset {
  id: number;
  name: string;
  description?: string;
  category?: AssetCategory;
  location?: AssetLocation;
  brand?: string;
  model?: string;
  serialNumber?: string;
  purchasePrice?: number;
  purchaseDate?: string;
  currentValue?: number;
  condition?: AssetCondition;
  imageUrl?: string;
  receiptUrl?: string;
  notes?: string;
  warrantyExpirationDate?: string;
  warrantyProvider?: string;
  warrantyType?: WarrantyType;
  warrantyDocumentUrl?: string;
  createdAt: string;
  updatedAt: string;
  tags?: AssetTag[];
}

export interface AssetTag {
  id: number;
  name: string;
  color: string;
  priority: number;
  createdAt: string;
}

export interface CreateAssetInput {
  name: string;
  description?: string;
  category?: AssetCategory;
  location?: AssetLocation;
  brand?: string;
  model?: string;
  serialNumber?: string;
  purchasePrice?: number;
  purchaseDate?: string;
  currentValue?: number;
  condition?: AssetCondition;
  imageUrl?: string;
  receiptUrl?: string;
  notes?: string;
  warrantyExpirationDate?: string;
  warrantyProvider?: string;
  warrantyType?: WarrantyType;
  warrantyDocumentUrl?: string;
  tags?: number[];
}

export interface UpdateAssetInput extends Partial<CreateAssetInput> {}

// Chore Types
export type ChoreFrequency = 'daily' | 'weekly' | 'monthly';
export type ChoreCategory = 'kitchen' | 'bedroom' | 'bathroom' | 'outdoor' | 'general';

export interface RecurrencePattern {
  frequency: ChoreFrequency;
  days?: number[]; // 0=Sunday, 1=Monday, etc. for weekly
  interval?: number; // every N days/weeks/months (default 1)
}

export interface ChoreDefinition {
  id: number;
  name: string;
  description?: string;
  icon?: string;
  category?: ChoreCategory;
  estimatedMinutes?: number;
  isRecurring: boolean;
  recurrencePattern?: RecurrencePattern;
  isRotating: boolean;
  rotationKidIds?: number[];
  currentRotationIndex: number;
  defaultKidId?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Computed/populated fields
  nextAssignedKid?: Kid;
  rotationKids?: Kid[];
}

export interface ChoreInstance {
  id: number;
  choreDefinitionId: number;
  assignedKidId: number;
  dueDate: string;
  dueTime?: string;
  completedAt?: string;
  stickerId?: number;
  createdAt: string;
  updatedAt: string;
  // Populated fields
  choreDefinition?: ChoreDefinition;
  assignedKid?: Kid;
}

export interface CreateChoreDefinitionInput {
  name: string;
  description?: string;
  icon?: string;
  category?: ChoreCategory;
  estimatedMinutes?: number;
  isRecurring?: boolean;
  recurrencePattern?: RecurrencePattern;
  isRotating?: boolean;
  rotationKidIds?: number[];
  defaultKidId?: number;
}

export interface UpdateChoreDefinitionInput extends Partial<CreateChoreDefinitionInput> {
  isActive?: boolean;
}

// Notification Types
export type NotificationType =
  | 'calendar_reminder'
  | 'task_due'
  | 'chore_due'
  | 'game_overdue'
  | 'bill_due'
  | 'warranty_expiring'
  | 'general_alert';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  icon?: string;
  priority: NotificationPriority;
  entityType?: string;
  entityId?: number;
  isRead: boolean;
  isDismissed: boolean;
  scheduledFor?: string;
  expiresAt?: string;
  createdAt: string;
  readAt?: string;
}

export interface CreateNotificationInput {
  type: NotificationType;
  title: string;
  message: string;
  icon?: string;
  priority?: NotificationPriority;
  entityType?: string;
  entityId?: number;
  scheduledFor?: string;
  expiresAt?: string;
}

export interface NotificationPreferences {
  id: number;
  digestEmail?: string;
  digestEnabled: boolean;
  digestTime: string;
  calendarReminders: boolean;
  taskDueAlerts: boolean;
  choreDueAlerts: boolean;
  gameOverdueAlerts: boolean;
  billReminders: boolean;
  warrantyExpiringAlerts: boolean;
  calendarReminderMinutes: number;
  taskReminderMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdatePreferencesInput {
  digestEmail?: string;
  digestEnabled?: boolean;
  digestTime?: string;
  calendarReminders?: boolean;
  taskDueAlerts?: boolean;
  choreDueAlerts?: boolean;
  gameOverdueAlerts?: boolean;
  billReminders?: boolean;
  warrantyExpiringAlerts?: boolean;
  calendarReminderMinutes?: number;
  taskReminderMinutes?: number;
}

export interface DigestLog {
  id: number;
  digestDate: string;
  emailTo: string;
  eventsCount: number;
  tasksCount: number;
  choresCount: number;
  contentSummary?: string;
  success: boolean;
  errorMessage?: string;
  sentAt: string;
}

// Mood Tracker Types
export type MoodType =
  | 'anxious'
  | 'sad'
  | 'stressed'
  | 'tired'
  | 'calm'
  | 'content'
  | 'happy'
  | 'excited'
  | 'grateful'
  | 'energized';

export type MoodActivity =
  | 'work'
  | 'exercise'
  | 'social'
  | 'family'
  | 'hobby'
  | 'rest'
  | 'outdoors'
  | 'screen_time'
  | 'reading'
  | 'chores';

export const MOOD_VALUES: Record<MoodType, number> = {
  anxious: 2,
  sad: 2,
  stressed: 2,
  tired: 3,
  calm: 4,
  content: 4,
  happy: 5,
  excited: 5,
  grateful: 5,
  energized: 5,
};

export interface FamilyMember {
  id: number;
  name: string;
  avatarColor: string;
  dateOfBirth?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MoodEntry {
  id: number;
  familyMemberId: number;
  mood: MoodType;
  energyLevel: number; // 1-5
  sleepQuality?: number; // 1-5
  sleepHours?: number;
  notes?: string;
  activities?: MoodActivity[];
  loggedAt: string;
  createdAt: string;
  updatedAt: string;
  // Populated
  familyMember?: FamilyMember;
}

export interface CreateFamilyMemberInput {
  name: string;
  avatarColor?: string;
  dateOfBirth?: string;
}

export interface UpdateFamilyMemberInput {
  name?: string;
  avatarColor?: string;
  dateOfBirth?: string;
  isActive?: boolean;
}

export interface CreateMoodEntryInput {
  familyMemberId: number;
  mood: MoodType;
  energyLevel: number;
  sleepQuality?: number;
  sleepHours?: number;
  notes?: string;
  activities?: MoodActivity[];
  loggedAt?: string;
}

export interface UpdateMoodEntryInput {
  mood?: MoodType;
  energyLevel?: number;
  sleepQuality?: number;
  sleepHours?: number;
  notes?: string;
  activities?: MoodActivity[];
}

export interface MoodTrend {
  memberId: number;
  memberName: string;
  period: string;
  totalEntries: number;
  averageMoodScore: number;
  averageEnergyLevel: number;
  averageSleepQuality?: number;
  averageSleepHours?: number;
  moodDistribution: Record<MoodType, number>;
  activityCorrelations: Record<MoodActivity, { count: number; avgMoodScore: number }>;
}

// Book Types
export type ReadStatus = 'Wishlist' | 'Not Started' | 'Reading' | 'Completed';

export interface Book {
  id: number;
  title: string;
  author?: string;
  isbn?: string;
  isbn13?: string;
  olid?: string; // Open Library Work ID
  publisher?: string;
  publishYear?: string;
  pages?: number;
  genre?: string;
  subject?: string;
  description?: string;
  coverUrl?: string;
  language?: string;
  readStatus: ReadStatus;
  myRating?: number; // 1-5
  personalNotes?: string;
  location?: string; // shelf/room
  rawOpenLibraryData?: string;
  createdAt: string;
  updatedAt: string;
  tags?: BookTag[];
  currentLoan?: BookLoan;
}

export interface BookTag {
  id: number;
  name: string;
  color: string;
  priority: number;
  createdAt: string;
}

export interface BookTagAssignment {
  bookId: number;
  tagId: number;
}

export interface BookLoan {
  id: number;
  bookId: number;
  borrowerName: string;
  borrowerContact?: string;
  loanedAt: string;
  dueDate?: string;
  returnedAt?: string;
  notes?: string;
}

export interface CreateBookInput {
  title: string;
  author?: string;
  isbn?: string;
  isbn13?: string;
  olid?: string;
  publisher?: string;
  publishYear?: string;
  pages?: number;
  genre?: string;
  subject?: string;
  description?: string;
  coverUrl?: string;
  language?: string;
  readStatus?: ReadStatus;
  myRating?: number;
  personalNotes?: string;
  location?: string;
  rawOpenLibraryData?: string;
  tags?: number[];
}

export interface UpdateBookInput extends Partial<CreateBookInput> {}

export interface CreateBookLoanInput {
  borrowerName: string;
  borrowerContact?: string;
  dueDate?: string;
  notes?: string;
}

// Open Library API Types
export interface OpenLibrarySearchResult {
  key: string; // e.g., "/works/OL12345W"
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  isbn?: string[];
  cover_i?: number; // Cover ID for image URL
  publisher?: string[];
  subject?: string[];
  number_of_pages_median?: number;
  language?: string[];
}

export interface OpenLibrarySearchResponse {
  numFound: number;
  start: number;
  docs: OpenLibrarySearchResult[];
}

export interface OpenLibraryWorkDetails {
  key: string;
  title: string;
  description?: string | { value: string };
  covers?: number[];
  subjects?: string[];
  subject_places?: string[];
  subject_times?: string[];
  authors?: Array<{ author: { key: string } }>;
}
