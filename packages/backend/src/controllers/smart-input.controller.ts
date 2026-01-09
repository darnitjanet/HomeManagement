import { Request, Response } from 'express';
import { parseSmartInput, categorizeGroceryItem, isAIEnabled } from '../services/ai.service';
import { ShoppingRepository } from '../repositories/shopping.repository';
import { GoogleCalendarService } from '../services/google-calendar.service';
import * as todoRepository from '../repositories/todo.repository';
import {
  SmartInputAction,
  ShoppingAction,
  CalendarAction,
  TodoAction,
  ActionExecutionResult,
  SmartInputResponse,
} from '../types/smart-input.types';

const shoppingRepo = new ShoppingRepository();

export async function processSmartInput(req: Request, res: Response) {
  try {
    const { input } = req.body;

    if (!input || typeof input !== 'string' || input.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Input is required',
      });
    }

    if (!isAIEnabled()) {
      return res.status(503).json({
        success: false,
        error: 'AI service not configured',
        message: 'Smart Input requires an Anthropic API key',
      });
    }

    // Parse the natural language input
    const currentDate = new Date().toISOString();
    const parseResult = await parseSmartInput(input.trim(), currentDate);

    if (parseResult.actions.length === 0) {
      return res.json({
        success: true,
        data: {
          results: [],
          authRequired: false,
          unrecognized: parseResult.unrecognized || input,
          message:
            'Could not understand the request. Try "Add milk to shopping" or "Schedule dentist Tuesday 2pm".',
        } as SmartInputResponse,
      });
    }

    // Execute each action
    const results: ActionExecutionResult[] = [];
    let authRequired = false;

    for (const action of parseResult.actions) {
      if (action.type === 'shopping') {
        const result = await executeShoppingAction(action);
        results.push(result);
      } else if (action.type === 'calendar') {
        if (req.googleAuth) {
          const result = await executeCalendarAction(action, req.googleAuth);
          results.push(result);
        } else {
          authRequired = true;
          results.push({
            action,
            success: false,
            message: 'Calendar requires Google login',
          });
        }
      } else if (action.type === 'todo') {
        const result = await executeTodoAction(action);
        results.push(result);
      }
    }

    const response: SmartInputResponse = {
      results,
      authRequired,
      unrecognized: parseResult.unrecognized,
    };

    res.json({
      success: true,
      data: response,
    });
  } catch (error: any) {
    console.error('Smart input processing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process input',
      message: error.message,
    });
  }
}

async function executeShoppingAction(
  action: ShoppingAction
): Promise<ActionExecutionResult> {
  try {
    // Auto-categorize grocery items using AI
    let category;
    if (action.listType === 'grocery') {
      category = await categorizeGroceryItem(action.name);
    }

    const id = await shoppingRepo.addItem({
      listType: action.listType,
      name: action.name,
      quantity: action.quantity || 1,
      category,
    });

    return {
      action,
      success: true,
      message: `Added "${action.name}" to ${action.listType} list`,
      data: { id, category },
    };
  } catch (error: any) {
    console.error('Shopping action error:', error);
    return {
      action,
      success: false,
      message: `Failed to add "${action.name}": ${error.message}`,
    };
  }
}

async function executeCalendarAction(
  action: CalendarAction,
  googleAuth: any
): Promise<ActionExecutionResult> {
  try {
    const calendarService = new GoogleCalendarService(googleAuth);
    const event = await calendarService.quickAddEvent('primary', action.text);

    return {
      action,
      success: true,
      message: `Created: "${event.summary}"`,
      data: {
        eventId: event.id || undefined,
        summary: event.summary || undefined,
      },
    };
  } catch (error: any) {
    console.error('Calendar action error:', error);
    return {
      action,
      success: false,
      message: `Failed to create event: ${error.message}`,
    };
  }
}

async function executeTodoAction(
  action: TodoAction
): Promise<ActionExecutionResult> {
  try {
    const todo = await todoRepository.createTodo({
      title: action.title,
      description: action.description,
      priority: action.priority || 'medium',
      energy_level: 'medium',
      context: 'anywhere',
    });

    return {
      action,
      success: true,
      message: `Task added: "${action.title}"`,
      data: { id: todo.id },
    };
  } catch (error: any) {
    console.error('Todo action error:', error);
    return {
      action,
      success: false,
      message: `Failed to create task: ${error.message}`,
    };
  }
}
