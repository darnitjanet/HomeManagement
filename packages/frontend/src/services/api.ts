import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // Important for session cookies
});

// Auth API
export const authApi = {
  getStatus: () => api.get('/auth/status'),
  login: () => api.get('/auth/google'),
  logout: () => api.post('/auth/logout'),
};

// Calendar API
export const calendarApi = {
  listCalendars: () => api.get('/calendar/calendars'),
  listEvents: (params?: {
    calendarId?: string;
    timeMin?: string;
    timeMax?: string;
    maxResults?: number;
  }) => api.get('/calendar/events', { params }),
  getEvent: (eventId: string, calendarId = 'primary') =>
    api.get(`/calendar/events/${eventId}`, { params: { calendarId } }),
  createEvent: (event: any) => api.post('/calendar/events', event),
  updateEvent: (eventId: string, event: any) =>
    api.put(`/calendar/events/${eventId}`, event),
  deleteEvent: (eventId: string, calendarId = 'primary') =>
    api.delete(`/calendar/events/${eventId}`, { params: { calendarId } }),
};

// Sync API
export const syncApi = {
  // Google calendar sync
  discoverCalendars: () => api.post('/sync/google/discover'),
  syncAllGoogle: () => api.post('/sync/google/calendars'),
  syncGoogleCalendar: (calendarId: string) =>
    api.post(`/sync/google/calendars/${calendarId}`),

  // External calendar management
  listExternalCalendars: () => api.get('/sync/external/calendars'),
  createExternalCalendar: (data: {
    name: string;
    icalUrl: string;
    color?: string;
    syncInterval?: number;
  }) => api.post('/sync/external/calendars', data),
  updateExternalCalendar: (id: number, data: any) =>
    api.put(`/sync/external/calendars/${id}`, data),
  deleteExternalCalendar: (id: number) =>
    api.delete(`/sync/external/calendars/${id}`),
  syncExternalCalendar: (id: number) =>
    api.post(`/sync/external/calendars/${id}/sync`),
  syncAllExternal: () => api.post('/sync/external/sync-all'),

  // Cached events and monitoring
  getCachedEvents: (
    calendarId: string,
    startDate: string,
    endDate: string
  ) =>
    api.get(`/sync/cached/${calendarId}/events`, {
      params: { startDate, endDate },
    }),
  getSyncLogs: (params?: { calendarId?: string; limit?: number }) =>
    api.get('/sync/logs', { params }),
  getSyncStats: (calendarId?: string) =>
    api.get('/sync/stats', { params: { calendarId } }),
};

// Contacts API
export const contactsApi = {
  // Sync contacts from Google
  syncContacts: () => api.post('/contacts/sync'),

  // Get contacts
  getAllContacts: () => api.get('/contacts'),
  getContact: (id: number) => api.get(`/contacts/${id}`),
  searchContacts: (query: string) => api.get('/contacts/search', { params: { q: query } }),
  getFavoriteContacts: () => api.get('/contacts/favorites'),
  getContactsByTag: (tagId: number) => api.get(`/contacts/tag/${tagId}`),

  // Create contact
  createContact: (data: {
    displayName: string;
    givenName?: string;
    familyName?: string;
    emails?: Array<{ value: string; type?: string }>;
    phones?: Array<{ value: string; type?: string }>;
    notes?: string;
  }) => api.post('/contacts', data),

  // Update contacts
  updateContact: (id: number, data: {
    displayName: string;
    givenName?: string;
    familyName?: string;
    emails?: Array<{ value: string; type?: string }>;
    phones?: Array<{ value: string; type?: string }>;
    notes?: string;
  }) => api.put(`/contacts/${id}`, data),
  toggleFavorite: (id: number) => api.post(`/contacts/${id}/favorite`),
  updateNotes: (id: number, notes: string) => api.put(`/contacts/${id}/notes`, { notes }),
  addTagToContact: (id: number, tagId: number) => api.post(`/contacts/${id}/tags`, { tagId }),
  removeTagFromContact: (id: number, tagId: number) => api.delete(`/contacts/${id}/tags/${tagId}`),

  // Delete contact
  deleteContact: (id: number) => api.delete(`/contacts/${id}`),

  // Tags management
  getAllTags: () => api.get('/contacts/tags/all'),
  createTag: (data: { name: string; color?: string; priority?: number }) =>
    api.post('/contacts/tags', data),
  updateTag: (id: number, data: any) => api.put(`/contacts/tags/${id}`, data),
  deleteTag: (id: number) => api.delete(`/contacts/tags/${id}`),

  // Sync stats
  getSyncStats: () => api.get('/contacts/sync/stats'),
  getSyncLogs: (limit?: number) => api.get('/contacts/sync/logs', { params: { limit } }),
};

// Movies API
export const moviesApi = {
  // OMDb search
  searchOMDb: (query: string) => api.get('/movies/omdb/search', { params: { q: query } }),
  getOMDbDetails: (imdbId: string) => api.get('/movies/omdb/details', { params: { imdbId } }),

  // Get movies
  getAllMovies: () => api.get('/movies'),
  getMovie: (id: number) => api.get(`/movies/${id}`),
  searchMovies: (query: string) => api.get('/movies/search', { params: { q: query } }),
  filterMovies: (filters: {
    genre?: string;
    myRating?: number;
    watchedStatus?: string;
    type?: string;
    mpaaRating?: string;
    format?: string;
  }) => api.get('/movies/filter', { params: filters }),
  getMoviesByTag: (tagId: number) => api.get(`/movies/tag/${tagId}`),

  // Create movies
  createMovie: (data: any) => api.post('/movies', data),
  createMovieFromOMDb: (data: {
    imdbId: string;
    myRating?: number;
    watchedStatus?: string;
    format?: string;
    personalNotes?: string;
    tags?: number[];
  }) => api.post('/movies/from-omdb', data),

  // Update movie
  updateMovie: (id: number, data: any) => api.put(`/movies/${id}`, data),
  updateMyRating: (id: number, rating: number) =>
    api.put(`/movies/${id}/rating`, { rating }),
  updateWatchedStatus: (id: number, status: string) =>
    api.put(`/movies/${id}/watched`, { status }),

  // Delete movie
  deleteMovie: (id: number) => api.delete(`/movies/${id}`),

  // Movie tags
  addTagToMovie: (id: number, tagId: number) =>
    api.post(`/movies/${id}/tags`, { tagId }),
  removeTagFromMovie: (id: number, tagId: number) =>
    api.delete(`/movies/${id}/tags/${tagId}`),

  // Tags management
  getAllTags: () => api.get('/movies/tags/all'),
  createTag: (data: { name: string; color?: string; priority?: number }) =>
    api.post('/movies/tags', data),
  updateTag: (id: number, data: any) => api.put(`/movies/tags/${id}`, data),
  deleteTag: (id: number) => api.delete(`/movies/tags/${id}`),
};

// Games API
export const gamesApi = {
  // Get games
  getAllGames: () => api.get('/games'),
  getGame: (id: number) => api.get(`/games/${id}`),
  searchGames: (query: string) => api.get('/games/search', { params: { q: query } }),
  filterGames: (filters: {
    type?: string;
    condition?: string;
    platform?: string;
    available?: boolean;
  }) => api.get('/games/filter', { params: filters }),
  getGamesByType: (type: string) => api.get(`/games/type/${type}`),
  getGamesByTag: (tagId: number) => api.get(`/games/tag/${tagId}`),
  getAvailableGames: () => api.get('/games/available'),
  getGamesOnLoan: () => api.get('/games/on-loan'),

  // Create game
  createGame: (data: {
    name: string;
    type: string;
    playerCountMin?: number;
    playerCountMax?: number;
    condition?: string;
    platform?: string;
    notes?: string;
    imageUrl?: string;
    tags?: number[];
  }) => api.post('/games', data),

  // Update game
  updateGame: (id: number, data: any) => api.put(`/games/${id}`, data),

  // Delete game
  deleteGame: (id: number) => api.delete(`/games/${id}`),

  // Loan management
  loanGame: (id: number, data: {
    borrowerName: string;
    borrowerContact?: string;
    expectedReturnDate?: string;
    notes?: string;
  }) => api.post(`/games/${id}/loan`, data),
  returnGame: (id: number) => api.put(`/games/${id}/return`),
  getActiveLoans: () => api.get('/games/loans/active'),
  getOverdueLoans: () => api.get('/games/loans/overdue'),
  getLoanHistory: (id: number) => api.get(`/games/${id}/loans`),

  // Game tags
  addTagToGame: (id: number, tagId: number) => api.post(`/games/${id}/tags/${tagId}`),
  removeTagFromGame: (id: number, tagId: number) => api.delete(`/games/${id}/tags/${tagId}`),

  // Tags management
  getAllTags: () => api.get('/games/tags/all'),
  createTag: (data: { name: string; color?: string; priority?: number }) =>
    api.post('/games/tags', data),
  updateTag: (id: number, data: any) => api.put(`/games/tags/${id}`, data),
  deleteTag: (id: number) => api.delete(`/games/tags/${id}`),
};

// Kids Rewards API
export const kidsApi = {
  // Kids CRUD
  getAllKids: () => api.get('/kids'),
  getKid: (id: number) => api.get(`/kids/${id}`),
  createKid: (data: { name: string; avatarColor?: string }) => api.post('/kids', data),
  updateKid: (id: number, data: { name?: string; avatarColor?: string }) =>
    api.put(`/kids/${id}`, data),
  deleteKid: (id: number) => api.delete(`/kids/${id}`),

  // Stickers
  getStickers: (kidId: number) => api.get(`/kids/${kidId}/stickers`),
  awardSticker: (kidId: number, data?: { reason?: string; awardedBy?: string }) =>
    api.post(`/kids/${kidId}/stickers`, data || {}),
  removeSticker: (kidId: number, stickerId: number) =>
    api.delete(`/kids/${kidId}/stickers/${stickerId}`),

  // Rewards
  getRewards: (kidId: number) => api.get(`/kids/${kidId}/rewards`),
  createReward: (kidId: number, data: { name: string; stickersRequired: number }) =>
    api.post(`/kids/${kidId}/rewards`, data),
  claimReward: (kidId: number, rewardId: number) =>
    api.put(`/kids/${kidId}/rewards/${rewardId}/claim`),
  unclaimReward: (kidId: number, rewardId: number) =>
    api.put(`/kids/${kidId}/rewards/${rewardId}/unclaim`),
  deleteReward: (kidId: number, rewardId: number) =>
    api.delete(`/kids/${kidId}/rewards/${rewardId}`),
};

// Smart Input API
export const smartInputApi = {
  process: (input: string) => api.post('/smart-input/process', { input }),
};

// Recipes API
export const recipesApi = {
  // AI Status
  getAIStatus: () => api.get('/recipes/ai-status'),

  // Get recipes
  getAllRecipes: () => api.get('/recipes'),
  getRecipe: (id: number) => api.get(`/recipes/${id}`),
  searchRecipes: (query: string) => api.get('/recipes/search', { params: { q: query } }),
  filterRecipes: (filters: {
    cuisine?: string;
    mealType?: string;
    difficulty?: string;
    dietary?: string;
    isFavorite?: boolean;
  }) => api.get('/recipes/filter', { params: filters }),
  getFavoriteRecipes: () => api.get('/recipes/favorites'),
  getRecipesByTag: (tagId: number) => api.get(`/recipes/tag/${tagId}`),

  // Create recipe
  createRecipe: (data: {
    name: string;
    instructions?: string;
    prepTimeMinutes?: number;
    cookTimeMinutes?: number;
    servings?: number;
    cuisine?: string;
    mealType?: string;
    difficulty?: string;
    dietary?: string;
    notes?: string;
    imageUrl?: string;
    sourceUrl?: string;
    ingredients?: Array<{
      name: string;
      quantity?: number;
      unit?: string;
      preparation?: string;
      optional?: boolean;
    }>;
    tags?: number[];
  }) => api.post('/recipes', data),

  // Update recipe
  updateRecipe: (id: number, data: any) => api.put(`/recipes/${id}`, data),
  toggleFavorite: (id: number) => api.post(`/recipes/${id}/favorite`),

  // Delete recipe
  deleteRecipe: (id: number) => api.delete(`/recipes/${id}`),

  // Shopping list integration
  addToShopping: (id: number, data?: {
    ingredientIds?: number[];
    scaleMultiplier?: number;
  }) => api.post(`/recipes/${id}/add-to-shopping`, data || {}),

  // URL Import
  importFromUrl: (url: string) => api.post('/recipes/import-url', { url }),

  // AI Suggestions
  suggestFromIngredients: (ingredients: string[]) =>
    api.post('/recipes/suggest/from-ingredients', { ingredients }),
  suggestByPreference: (preferences: {
    cuisine?: string;
    mealType?: string;
    dietary?: string;
    maxTimeMinutes?: number;
    difficulty?: string;
  }) => api.post('/recipes/suggest/by-preference', preferences),
  generateFromSuggestion: (suggestion: {
    name: string;
    description?: string;
    cuisine?: string;
  }) => api.post('/recipes/suggest/generate', suggestion),

  // Recipe tags
  addTagToRecipe: (id: number, tagId: number) =>
    api.post(`/recipes/${id}/tags/${tagId}`),
  removeTagFromRecipe: (id: number, tagId: number) =>
    api.delete(`/recipes/${id}/tags/${tagId}`),

  // Tags management
  getAllTags: () => api.get('/recipes/tags/all'),
  createTag: (data: { name: string; color?: string; priority?: number }) =>
    api.post('/recipes/tags', data),
  updateTag: (id: number, data: any) => api.put(`/recipes/tags/${id}`, data),
  deleteTag: (id: number) => api.delete(`/recipes/tags/${id}`),
};

// Shopping API
export const shoppingApi = {
  // Shopping Items
  getItems: (listType: 'grocery' | 'other') =>
    api.get(`/shopping/${listType}/items`),
  addItem: (listType: 'grocery' | 'other', data: {
    name: string;
    quantity?: number;
    category?: string;
  }) => api.post(`/shopping/${listType}/items`, data),
  updateItemQuantity: (listType: 'grocery' | 'other', id: number, quantity: number) =>
    api.put(`/shopping/${listType}/items/${id}`, { quantity }),
  removeItem: (listType: 'grocery' | 'other', id: number) =>
    api.delete(`/shopping/${listType}/items/${id}`),
  clearList: (listType: 'grocery' | 'other') =>
    api.delete(`/shopping/${listType}/items`),

  // Favorites
  getFavorites: (listType: 'grocery' | 'other') =>
    api.get(`/shopping/${listType}/favorites`),
  addFavorite: (listType: 'grocery' | 'other', data: {
    name: string;
    category?: string;
    defaultQuantity?: number;
  }) => api.post(`/shopping/${listType}/favorites`, data),
  removeFavorite: (listType: 'grocery' | 'other', id: number) =>
    api.delete(`/shopping/${listType}/favorites/${id}`),
  addFavoriteToList: (listType: 'grocery' | 'other', id: number) =>
    api.post(`/shopping/${listType}/favorites/${id}/add`),
};

// Pantry API
export const pantryApi = {
  // Constants
  getConstants: () => api.get('/pantry/constants'),

  // Items CRUD
  getAllItems: (params?: { category?: string; location?: string }) =>
    api.get('/pantry/items', { params }),
  getItem: (id: number) => api.get(`/pantry/items/${id}`),
  createItem: (data: {
    name: string;
    quantity?: number;
    unit?: string;
    category?: string;
    location?: string;
    expirationDate?: string;
    purchaseDate?: string;
    lowStockThreshold?: number;
    notes?: string;
  }) => api.post('/pantry/items', data),
  updateItem: (id: number, data: {
    name?: string;
    quantity?: number;
    unit?: string;
    category?: string;
    location?: string;
    expirationDate?: string | null;
    purchaseDate?: string | null;
    lowStockThreshold?: number | null;
    notes?: string | null;
  }) => api.put(`/pantry/items/${id}`, data),
  deleteItem: (id: number) => api.delete(`/pantry/items/${id}`),

  // Search
  search: (query: string) => api.get('/pantry/search', { params: { q: query } }),

  // Alerts
  getExpiring: (days: number = 7) => api.get('/pantry/expiring', { params: { days } }),
  getExpired: () => api.get('/pantry/expired'),
  getLowStock: () => api.get('/pantry/low-stock'),

  // Quantity operations
  updateQuantity: (id: number, quantity: number) =>
    api.patch(`/pantry/items/${id}/quantity`, { quantity }),
  incrementQuantity: (id: number, amount: number = 1) =>
    api.post(`/pantry/items/${id}/increment`, { amount }),
  decrementQuantity: (id: number, amount: number = 1) =>
    api.post(`/pantry/items/${id}/decrement`, { amount }),

  // Bulk operations
  addMultiple: (items: Array<{
    name: string;
    quantity?: number;
    unit?: string;
    category?: string;
    location?: string;
    expirationDate?: string;
  }>) => api.post('/pantry/bulk', { items }),

  // AI integration
  getIngredients: () => api.get('/pantry/ingredients'),
  getIngredientsDetailed: () => api.get('/pantry/ingredients/detailed'),

  // Barcode lookup
  lookupBarcode: (barcode: string) => api.get(`/pantry/barcode/${barcode}`),
};

// Assets API
export const assetsApi = {
  // Get assets
  getAllAssets: () => api.get('/assets'),
  getAsset: (id: number) => api.get(`/assets/${id}`),
  searchAssets: (query: string) => api.get('/assets/search', { params: { q: query } }),
  filterAssets: (filters: {
    category?: string;
    location?: string;
    condition?: string;
  }) => api.get('/assets/filter', { params: filters }),
  getAssetsByTag: (tagId: number) => api.get(`/assets/tag/${tagId}`),

  // Summary
  getSummary: () => api.get('/assets/summary'),

  // Create asset
  createAsset: (data: {
    name: string;
    description?: string;
    category?: string;
    location?: string;
    brand?: string;
    model?: string;
    serialNumber?: string;
    purchasePrice?: number;
    purchaseDate?: string;
    currentValue?: number;
    condition?: string;
    imageUrl?: string;
    receiptUrl?: string;
    notes?: string;
    tags?: number[];
  }) => api.post('/assets', data),

  // Update asset
  updateAsset: (id: number, data: any) => api.put(`/assets/${id}`, data),

  // Delete asset
  deleteAsset: (id: number) => api.delete(`/assets/${id}`),

  // Asset tags
  addTagToAsset: (id: number, tagId: number) => api.post(`/assets/${id}/tags/${tagId}`),
  removeTagFromAsset: (id: number, tagId: number) => api.delete(`/assets/${id}/tags/${tagId}`),

  // Tags management
  getAllTags: () => api.get('/assets/tags/all'),
  createTag: (data: { name: string; color?: string; priority?: number }) =>
    api.post('/assets/tags', data),
  updateTag: (id: number, data: any) => api.put(`/assets/tags/${id}`, data),
  deleteTag: (id: number) => api.delete(`/assets/tags/${id}`),
};

// Weather API
export const weatherApi = {
  getCurrent: (location?: string) =>
    api.get('/weather', { params: location ? { location } : undefined }),
  getForecast: (location?: string) =>
    api.get('/weather/forecast', { params: location ? { location } : undefined }),
};

// Notes API
export const notesApi = {
  getAllNotes: () => api.get('/notes'),
  getNote: (id: number) => api.get(`/notes/${id}`),
  createNote: (data: { title: string; content?: string; color?: string; pinned?: boolean }) =>
    api.post('/notes', data),
  updateNote: (id: number, data: { title?: string; content?: string; color?: string; pinned?: boolean }) =>
    api.put(`/notes/${id}`, data),
  togglePin: (id: number) => api.put(`/notes/${id}/pin`),
  deleteNote: (id: number) => api.delete(`/notes/${id}`),
};

// Todos API (ADHD-friendly task management)
export const todosApi = {
  // Basic CRUD
  getAllTodos: (includeCompleted = false) =>
    api.get('/todos', { params: { includeCompleted } }),
  getTodaysTodos: () => api.get('/todos/today'),
  getKioskTodos: (limit = 5) => api.get('/todos/kiosk', { params: { limit } }),
  getTodo: (id: number) => api.get(`/todos/${id}`),
  getSubtasks: (parentId: number) => api.get(`/todos/${parentId}/subtasks`),

  createTodo: (data: {
    title: string;
    description?: string;
    priority?: 'urgent' | 'high' | 'medium' | 'low';
    energy_level?: 'low' | 'medium' | 'high';
    estimated_minutes?: number;
    due_date?: string;
    due_time?: string;
    context?: 'home' | 'errands' | 'computer' | 'phone' | 'anywhere';
    parent_id?: number;
    is_recurring?: boolean;
    recurrence_pattern?: string;
  }) => api.post('/todos', data),

  updateTodo: (id: number, data: any) => api.put(`/todos/${id}`, data),
  completeTodo: (id: number) => api.put(`/todos/${id}/complete`),
  uncompleteTodo: (id: number) => api.put(`/todos/${id}/uncomplete`),
  snoozeTodo: (id: number, until: string) => api.put(`/todos/${id}/snooze`, { until }),
  deleteTodo: (id: number) => api.delete(`/todos/${id}`),

  // AI Features
  getAIStatus: () => api.get('/todos/ai/status'),
  breakdownTask: (id: number) => api.post(`/todos/${id}/breakdown`),
  getNudge: () => api.get('/todos/ai/nudge'),
  getSuggestion: (minutes?: number, location?: string) =>
    api.get('/todos/ai/suggest', { params: { minutes, location } }),

  // Filtered views
  getTodosByEnergy: (level: 'low' | 'medium' | 'high') => api.get(`/todos/energy/${level}`),
};

// Chores API
export const choresApi = {
  // Definitions (Admin)
  getAllDefinitions: () => api.get('/chores/definitions'),
  getDefinition: (id: number) => api.get(`/chores/definitions/${id}`),
  createDefinition: (data: {
    name: string;
    description?: string;
    icon?: string;
    category?: string;
    estimatedMinutes?: number;
    isRecurring?: boolean;
    recurrencePattern?: { frequency: string; days?: number[]; interval?: number };
    isRotating?: boolean;
    rotationKidIds?: number[];
    defaultKidId?: number;
  }) => api.post('/chores/definitions', data),
  updateDefinition: (id: number, data: any) => api.put(`/chores/definitions/${id}`, data),
  deleteDefinition: (id: number) => api.delete(`/chores/definitions/${id}`),

  // Instances
  getTodaysChores: () => api.get('/chores/today'),
  getUpcomingChores: (days = 7) => api.get('/chores/upcoming', { params: { days } }),
  getChoresByKid: (kidId: number, includeCompleted = false) =>
    api.get(`/chores/kid/${kidId}`, { params: { includeCompleted } }),
  getChoreInstance: (id: number) => api.get(`/chores/instances/${id}`),

  // Completion
  completeChore: (instanceId: number) => api.put(`/chores/instances/${instanceId}/complete`),
  uncompleteChore: (instanceId: number) => api.put(`/chores/instances/${instanceId}/uncomplete`),
};

// Mood Tracker API
export const moodApi = {
  // Family Members
  getFamilyMembers: (includeInactive = false) =>
    api.get('/mood/family-members', { params: { includeInactive } }),
  getFamilyMember: (id: number) => api.get(`/mood/family-members/${id}`),
  createFamilyMember: (data: {
    name: string;
    avatarColor?: string;
    dateOfBirth?: string;
  }) => api.post('/mood/family-members', data),
  updateFamilyMember: (id: number, data: {
    name?: string;
    avatarColor?: string;
    dateOfBirth?: string;
    isActive?: boolean;
  }) => api.put(`/mood/family-members/${id}`, data),
  deleteFamilyMember: (id: number) => api.delete(`/mood/family-members/${id}`),

  // Mood Entries
  getEntries: (params?: {
    familyMemberId?: number;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }) => api.get('/mood/entries', { params }),
  getEntry: (id: number) => api.get(`/mood/entries/${id}`),
  createEntry: (data: {
    familyMemberId: number;
    mood: string;
    energyLevel: number;
    sleepQuality?: number;
    sleepHours?: number;
    notes?: string;
    activities?: string[];
    loggedAt?: string;
  }) => api.post('/mood/entries', data),
  updateEntry: (id: number, data: {
    mood?: string;
    energyLevel?: number;
    sleepQuality?: number;
    sleepHours?: number;
    notes?: string;
    activities?: string[];
  }) => api.put(`/mood/entries/${id}`, data),
  deleteEntry: (id: number) => api.delete(`/mood/entries/${id}`),

  // Trends
  getAllTrends: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/mood/trends', { params }),
  getTrends: (memberId: number, params?: { startDate?: string; endDate?: string }) =>
    api.get(`/mood/trends/${memberId}`, { params }),
  getTimeSeries: (params?: { memberId?: number; startDate?: string; endDate?: string }) =>
    api.get('/mood/time-series', { params }),
};

// Books API
export const booksApi = {
  // Open Library search
  searchOpenLibrary: (query: string) => api.get('/books/openlibrary/search', { params: { q: query } }),
  getOpenLibraryDetails: (olid: string) => api.get('/books/openlibrary/details', { params: { olid } }),

  // Get books
  getAllBooks: () => api.get('/books'),
  getBook: (id: number) => api.get(`/books/${id}`),
  searchBooks: (query: string) => api.get('/books/search', { params: { q: query } }),
  filterBooks: (filters: {
    readStatus?: string;
    author?: string;
    genre?: string;
    hasLoan?: boolean;
  }) => api.get('/books/filter', { params: filters }),
  getBooksByTag: (tagId: number) => api.get(`/books/tag/${tagId}`),

  // Create books
  createBook: (data: any) => api.post('/books', data),
  createBookFromOpenLibrary: (data: {
    title: string;
    author?: string;
    isbn?: string;
    isbn13?: string;
    olid?: string;
    publisher?: string;
    publishYear?: string;
    pages?: number;
    subject?: string;
    description?: string;
    coverUrl?: string;
    language?: string;
    readStatus?: string;
    myRating?: number;
    personalNotes?: string;
    location?: string;
    tags?: number[];
  }) => api.post('/books/from-openlibrary', data),

  // Update book
  updateBook: (id: number, data: any) => api.put(`/books/${id}`, data),
  updateReadStatus: (id: number, readStatus: string) =>
    api.put(`/books/${id}/status`, { readStatus }),
  updateMyRating: (id: number, myRating: number) =>
    api.put(`/books/${id}/rating`, { myRating }),

  // Delete book
  deleteBook: (id: number) => api.delete(`/books/${id}`),

  // Loan management
  loanBook: (id: number, data: {
    borrowerName: string;
    borrowerContact?: string;
    dueDate?: string;
    notes?: string;
  }) => api.post(`/books/${id}/loan`, data),
  returnBook: (id: number) => api.put(`/books/${id}/return`),
  getActiveLoans: () => api.get('/books/loans/active'),
  getOverdueLoans: () => api.get('/books/loans/overdue'),
  getLoanHistory: (id: number) => api.get(`/books/${id}/loans`),

  // Book tags
  addTagToBook: (id: number, tagId: number) =>
    api.post(`/books/${id}/tags`, { tagId }),
  removeTagFromBook: (id: number, tagId: number) =>
    api.delete(`/books/${id}/tags/${tagId}`),

  // Tags management
  getAllTags: () => api.get('/books/tags/all'),
  createTag: (data: { name: string; color?: string; priority?: number }) =>
    api.post('/books/tags', data),
  updateTag: (id: number, data: any) => api.put(`/books/tags/${id}`, data),
  deleteTag: (id: number) => api.delete(`/books/tags/${id}`),
};

// Notifications API
export const notificationsApi = {
  // Notifications
  getAll: (includeRead = false, limit?: number) =>
    api.get('/notifications', { params: { includeRead, limit } }),
  getUnreadCount: () => api.get('/notifications/count'),
  markAsRead: (id: number) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  dismiss: (id: number) => api.delete(`/notifications/${id}`),
  dismissAll: () => api.delete('/notifications/dismiss-all'),

  // Preferences
  getPreferences: () => api.get('/notifications/preferences'),
  updatePreferences: (data: {
    digestEmail?: string;
    digestEnabled?: boolean;
    digestTime?: string;
    calendarReminders?: boolean;
    taskDueAlerts?: boolean;
    choreDueAlerts?: boolean;
    gameOverdueAlerts?: boolean;
    billReminders?: boolean;
    plantWateringAlerts?: boolean;
    warrantyExpiringAlerts?: boolean;
    vacationMode?: boolean;
    vacationStartDate?: string | null;
    vacationEndDate?: string | null;
    calendarReminderMinutes?: number;
    taskReminderMinutes?: number;
  }) => api.put('/notifications/preferences', data),

  // Email
  testEmail: (email: string) => api.post('/notifications/test-email', { email }),
  sendDigestNow: () => api.post('/notifications/send-digest'),

  // Manual trigger (for testing)
  triggerCheck: () => api.post('/notifications/trigger-check'),
};

// Travel API
export const travelApi = {
  // Places
  getAllPlaces: () => api.get('/travel/places'),
  getPlace: (id: number) => api.get(`/travel/places/${id}`),
  createPlace: (data: {
    name: string;
    country?: string;
    countryCode?: string;
    state?: string;
    stateCode?: string;
    latitude: number;
    longitude: number;
    visitDate?: string;
    visitEndDate?: string;
    tripId?: number;
    tripName?: string;
    notes?: string;
    highlights?: string;
    rating?: number;
    companions?: string;
    expenses?: string;
    photoUrls?: string;
  }) => api.post('/travel/places', data),
  updatePlace: (id: number, data: any) => api.put(`/travel/places/${id}`, data),
  deletePlace: (id: number) => api.delete(`/travel/places/${id}`),
  searchPlaces: (query: string) => api.get('/travel/places/search', { params: { q: query } }),
  getPlacesByCountry: (countryCode: string) => api.get(`/travel/places/country/${countryCode}`),

  // Trips
  getAllTrips: () => api.get('/travel/trips'),
  getTrip: (id: number) => api.get(`/travel/trips/${id}`),
  createTrip: (data: {
    name: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  }) => api.post('/travel/trips', data),
  updateTrip: (id: number, data: any) => api.put(`/travel/trips/${id}`, data),
  deleteTrip: (id: number) => api.delete(`/travel/trips/${id}`),
  getPlacesByTrip: (tripId: number) => api.get(`/travel/trips/${tripId}/places`),

  // Stats
  getStats: () => api.get('/travel/stats'),

  // Packing Lists
  getPackingItems: (tripId: number, assignee?: string) =>
    api.get(`/travel/trips/${tripId}/packing`, { params: assignee ? { assignee } : {} }),
  getPackingProgress: (tripId: number) => api.get(`/travel/trips/${tripId}/packing/progress`),
  createPackingItem: (tripId: number, data: {
    name: string;
    category?: string;
    quantity?: number;
    assignee?: string;
  }) => api.post(`/travel/trips/${tripId}/packing`, data),
  createPackingItems: (tripId: number, items: Array<{
    name: string;
    category?: string;
    quantity?: number;
    assignee?: string;
  }>) => api.post(`/travel/trips/${tripId}/packing/bulk`, { items }),
  updatePackingItem: (id: number, data: {
    name?: string;
    category?: string;
    quantity?: number;
    packed?: boolean;
    assignee?: string;
  }) => api.put(`/travel/packing/${id}`, data),
  togglePackingItem: (id: number) => api.patch(`/travel/packing/${id}/toggle`),
  deletePackingItem: (id: number) => api.delete(`/travel/packing/${id}`),
  clearPackingList: (tripId: number) => api.delete(`/travel/trips/${tripId}/packing`),
};

// Plants API
export const plantsApi = {
  // Get all plants
  getAllPlants: (includeInactive?: boolean) =>
    api.get('/plants', { params: { includeInactive } }),

  // Get single plant
  getPlant: (id: number) => api.get(`/plants/${id}`),

  // Get plants needing water
  getPlantsNeedingWater: () => api.get('/plants/needs-water'),

  // Get plants needing water soon
  getPlantsNeedingWaterSoon: (days?: number) =>
    api.get('/plants/needs-water-soon', { params: { days } }),

  // Get plant statistics
  getStats: () => api.get('/plants/stats'),

  // Get common species list
  getCommonSpecies: () => api.get('/plants/species'),

  // Get care suggestion for a species
  getCareSuggestion: (species?: string) =>
    api.get('/plants/care-suggestion', { params: { species } }),

  // Create plant
  createPlant: (data: {
    name: string;
    species?: string;
    location?: string;
    watering_frequency_days?: number;
    last_watered?: string;
    sunlight_needs?: string;
    image_url?: string;
    notes?: string;
    care_instructions?: string;
  }) => api.post('/plants', data),

  // Update plant
  updatePlant: (id: number, data: {
    name?: string;
    species?: string | null;
    location?: string | null;
    watering_frequency_days?: number;
    last_watered?: string | null;
    sunlight_needs?: string | null;
    image_url?: string | null;
    notes?: string | null;
    care_instructions?: string | null;
    is_active?: boolean;
  }) => api.put(`/plants/${id}`, data),

  // Delete plant
  deletePlant: (id: number) => api.delete(`/plants/${id}`),

  // Water a plant
  waterPlant: (id: number, notes?: string) =>
    api.post(`/plants/${id}/water`, { notes }),

  // Get watering history
  getWateringHistory: (id: number, limit?: number) =>
    api.get(`/plants/${id}/history`, { params: { limit } }),
};

// Meal Plan API
export const mealPlanApi = {
  // Get meal plan for a specific week
  getMealPlan: (weekStart: string) =>
    api.get('/meal-plans', { params: { weekStart } }),

  // Get current week's meal plan
  getCurrentMealPlan: () => api.get('/meal-plans/current'),

  // Add or update a meal plan entry
  addEntry: (weekStart: string, data: {
    day_of_week: number;
    meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    recipe_id?: number | null;
    custom_meal?: string | null;
    notes?: string | null;
    servings?: number;
  }) => api.post('/meal-plans/entries', data, { params: { weekStart } }),

  // Update a meal plan entry
  updateEntry: (id: number, data: {
    recipe_id?: number | null;
    custom_meal?: string | null;
    notes?: string | null;
    servings?: number;
  }) => api.put(`/meal-plans/entries/${id}`, data),

  // Delete a meal plan entry
  deleteEntry: (id: number) => api.delete(`/meal-plans/entries/${id}`),

  // Clear all entries for a week
  clearWeek: (weekStart: string) =>
    api.delete('/meal-plans/clear', { params: { weekStart } }),

  // Copy meal plan from one week to another
  copyWeek: (fromWeek: string, toWeek: string) =>
    api.post('/meal-plans/copy', { fromWeek, toWeek }),

  // Generate shopping list from meal plan
  generateShoppingList: (weekStart: string) =>
    api.get('/meal-plans/shopping-list', { params: { weekStart } }),
};

// Emergency API (Contacts, Info, Family Rules)
export const emergencyApi = {
  // Emergency Contacts
  getAllContacts: () => api.get('/emergency/contacts'),
  createContact: (data: {
    name: string;
    relationship?: string;
    phone?: string;
    phone_secondary?: string;
    email?: string;
    address?: string;
    notes?: string;
    priority?: number;
  }) => api.post('/emergency/contacts', data),
  updateContact: (id: number, data: {
    name?: string;
    relationship?: string;
    phone?: string;
    phone_secondary?: string;
    email?: string;
    address?: string;
    notes?: string;
    priority?: number;
    is_active?: boolean;
  }) => api.put(`/emergency/contacts/${id}`, data),
  deleteContact: (id: number) => api.delete(`/emergency/contacts/${id}`),

  // Emergency Info
  getAllInfo: (category?: string) =>
    api.get('/emergency/info', { params: category ? { category } : {} }),
  createInfo: (data: {
    category: string;
    label: string;
    value: string;
    notes?: string;
    priority?: number;
  }) => api.post('/emergency/info', data),
  updateInfo: (id: number, data: {
    category?: string;
    label?: string;
    value?: string;
    notes?: string;
    priority?: number;
    is_active?: boolean;
  }) => api.put(`/emergency/info/${id}`, data),
  deleteInfo: (id: number) => api.delete(`/emergency/info/${id}`),

  // Family Rules
  getAllRules: (category?: string) =>
    api.get('/emergency/rules', { params: category ? { category } : {} }),
  createRule: (data: {
    title: string;
    description?: string;
    category?: string;
    priority?: number;
  }) => api.post('/emergency/rules', data),
  updateRule: (id: number, data: {
    title?: string;
    description?: string;
    category?: string;
    priority?: number;
    is_active?: boolean;
  }) => api.put(`/emergency/rules/${id}`, data),
  deleteRule: (id: number) => api.delete(`/emergency/rules/${id}`),
  reorderRules: (orderedIds: number[]) =>
    api.post('/emergency/rules/reorder', { orderedIds }),
};

export default api;
