import { GroceryCategory, ListType } from './index';

// Action types that Smart Input can parse
export type SmartInputActionType = 'shopping' | 'calendar' | 'todo';

export interface ShoppingAction {
  type: 'shopping';
  listType: ListType;
  name: string;
  quantity: number;
}

export interface CalendarAction {
  type: 'calendar';
  text: string; // Natural language for Google's quick-add
}

export interface TodoAction {
  type: 'todo';
  title: string;
  description?: string;
  priority?: 'urgent' | 'high' | 'medium' | 'low';
}

export type SmartInputAction = ShoppingAction | CalendarAction | TodoAction;

export interface SmartInputParseResult {
  actions: SmartInputAction[];
  unrecognized: string | null;
}

export interface ActionExecutionResult {
  action: SmartInputAction;
  success: boolean;
  message: string;
  data?: {
    id?: number;
    category?: GroceryCategory;
    eventId?: string;
    summary?: string;
  };
}

export interface SmartInputResponse {
  results: ActionExecutionResult[];
  authRequired: boolean;
  unrecognized: string | null;
}
