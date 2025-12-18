/**
 * WhatsApp Chat Parser
 *
 * Parses raw WhatsApp export text into structured messages.
 * Handles multiple export formats (iOS/Android, US/EU dates).
 *
 * @module parser
 */

import type {
  ParsedMessage,
  ParseError,
  ParseResult,
  SpeakerMapping,
  Speaker,
  Message,
} from './types';
import { CURRENT_SCHEMA_VERSION } from './types';

// ============================================================================
// Regex Patterns
// ============================================================================

/**
 * Pattern 1: iOS/US format with brackets
 * Example: [12/18/24, 10:30:15 AM] John: Hello
 * Groups: [1]=date, [2]=time, [3]=speaker, [4]=message
 */
const PATTERN_BRACKETS =
  /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)\]\s*([^:]+):\s*(.*)$/i;

/**
 * Pattern 2: Android format with dash separator
 * Example: 12/18/24, 10:30 AM - John: Hello
 * Groups: [1]=date, [2]=time, [3]=speaker, [4]=message
 */
const PATTERN_DASH =
  /^(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)\s*-\s*([^:]+):\s*(.*)$/i;

/**
 * Pattern 3: System message with brackets but no speaker colon
 * Example: [12/18/24, 10:00:00 AM] Messages and calls are end-to-end encrypted.
 * Groups: [1]=date, [2]=time, [3]=rest of line (no colon-separated speaker)
 */
const PATTERN_SYSTEM_BRACKETS =
  /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)\]\s*([^:]+)$/i;

/**
 * Pattern 4: System message with dash but no speaker colon
 * Example: 12/18/24, 10:00 AM - Messages and calls are end-to-end encrypted.
 */
const PATTERN_SYSTEM_DASH =
  /^(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)\s*-\s*([^:]+)$/i;

/**
 * System message patterns to filter out
 */
const SYSTEM_PATTERNS: RegExp[] = [
  /messages and calls are end-to-end encrypted/i,
  /created group/i,
  /added\s+\w+/i,
  /changed the subject/i,
  /\bleft$/i,
  /joined using this group/i,
  /changed this group's icon/i,
  /changed the group description/i,
  /removed\s+\w+/i,
  /now an admin/i,
  /no longer an admin/i,
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a line is a WhatsApp system message
 */
function isSystemMessage(text: string): boolean {
  return SYSTEM_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Parse date string to determine if it's US (M/D/Y) or EU (D/M/Y) format
 * and convert to ISO date string.
 *
 * We assume:
 * - If first number > 12, it's day (EU format)
 * - Otherwise, assume US format (month first)
 */
function parseDateTime(dateStr: string, timeStr: string): string | null {
  try {
    // Parse date parts
    const dateParts = dateStr.split('/').map((p) => parseInt(p, 10));
    if (dateParts.length !== 3) return null;

    let month: number;
    let day: number;
    let year: number;

    const [first, second, third] = dateParts as [number, number, number];

    // Determine format based on values
    if (first > 12) {
      // First number > 12, must be day (EU format: D/M/Y)
      day = first;
      month = second;
      year = third;
    } else if (second > 12) {
      // Second number > 12, must be day (US format: M/D/Y)
      month = first;
      day = second;
      year = third;
    } else {
      // Ambiguous - default to US format (M/D/Y)
      month = first;
      day = second;
      year = third;
    }

    // Normalize 2-digit year
    if (year < 100) {
      year += year < 50 ? 2000 : 1900;
    }

    // Parse time
    let hours = 0;
    let minutes = 0;
    let seconds = 0;

    const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
    if (timeMatch) {
      hours = parseInt(timeMatch[1]!, 10);
      minutes = parseInt(timeMatch[2]!, 10);
      seconds = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;

      // Handle AM/PM
      const period = timeMatch[4]?.toUpperCase();
      if (period === 'PM' && hours < 12) {
        hours += 12;
      } else if (period === 'AM' && hours === 12) {
        hours = 0;
      }
    }

    // Create date and return ISO string
    const date = new Date(year, month - 1, day, hours, minutes, seconds);
    if (isNaN(date.getTime())) return null;

    return date.toISOString();
  } catch {
    return null;
  }
}

/**
 * Try to parse a line using various WhatsApp formats
 */
function tryParseLine(
  line: string,
  lineNumber: number
): { parsed: ParsedMessage } | { error: ParseError } | { continuation: string } | null {
  const trimmed = line.trim();

  // Empty line
  if (!trimmed) {
    return null;
  }

  // Check for system messages first (timestamp but no speaker:message format)
  let match = PATTERN_SYSTEM_BRACKETS.exec(trimmed);
  if (match) {
    const [, , , text] = match;
    if (isSystemMessage(text || '')) {
      return {
        error: {
          lineNumber,
          rawLine: line,
          reason: 'system_message',
        },
      };
    }
  }

  match = PATTERN_SYSTEM_DASH.exec(trimmed);
  if (match) {
    const [, , , text] = match;
    if (isSystemMessage(text || '')) {
      return {
        error: {
          lineNumber,
          rawLine: line,
          reason: 'system_message',
        },
      };
    }
  }

  // Try brackets format [M/D/YY, H:MM:SS AM] Speaker: message
  match = PATTERN_BRACKETS.exec(trimmed);
  if (match) {
    const [, dateStr, timeStr, speaker, text] = match;

    // Check for system message
    if (isSystemMessage(text || '') || isSystemMessage(speaker || '')) {
      return {
        error: {
          lineNumber,
          rawLine: line,
          reason: 'system_message',
        },
      };
    }

    return {
      parsed: {
        speaker: speaker!.trim(),
        text: text || '',
        timestamp: parseDateTime(dateStr!, timeStr!),
        rawLine: line,
        lineNumber,
      },
    };
  }

  // Try dash format: M/D/YY, H:MM AM - Speaker: message
  match = PATTERN_DASH.exec(trimmed);
  if (match) {
    const [, dateStr, timeStr, speaker, text] = match;

    // Check for system message
    if (isSystemMessage(text || '') || isSystemMessage(speaker || '')) {
      return {
        error: {
          lineNumber,
          rawLine: line,
          reason: 'system_message',
        },
      };
    }

    return {
      parsed: {
        speaker: speaker!.trim(),
        text: text || '',
        timestamp: parseDateTime(dateStr!, timeStr!),
        rawLine: line,
        lineNumber,
      },
    };
  }

  // Line doesn't match any pattern - treat as continuation
  return { continuation: trimmed };
}

// ============================================================================
// Main Parser Function
// ============================================================================

/**
 * Parse raw WhatsApp export text into structured messages.
 *
 * Handles formats:
 * - [12/18/24, 10:30:15 AM] John: Hello (iOS/US)
 * - [18/12/24, 10:30:15] John: Hello (EU 24h)
 * - 12/18/24, 10:30 AM - John: Hello (Android)
 *
 * Multi-line messages: Lines without timestamp are appended to previous.
 * System messages: Filtered (encryption notices, group events, etc.)
 *
 * @param rawText - Raw text copied from WhatsApp export
 * @returns ParseResult with messages, speakers, errors, and stats
 */
export function parseWhatsAppText(rawText: string): ParseResult {
  // Handle empty input
  if (!rawText || !rawText.trim()) {
    return {
      messages: [],
      detectedSpeakers: [],
      errors: [],
      stats: {
        totalLines: 0,
        parsedCount: 0,
        errorCount: 0,
        systemMessagesFiltered: 0,
      },
    };
  }

  const lines = rawText.split('\n');
  const messages: ParsedMessage[] = [];
  const errors: ParseError[] = [];
  const speakerSet = new Set<string>();

  let systemMessagesFiltered = 0;
  let lastMessage: ParsedMessage | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const lineNumber = i + 1;
    const result = tryParseLine(line, lineNumber);

    if (result === null) {
      // Empty line - skip
      continue;
    }

    if ('parsed' in result) {
      // New message
      lastMessage = result.parsed;
      messages.push(lastMessage);
      speakerSet.add(lastMessage.speaker);
    } else if ('continuation' in result) {
      // Continuation of previous message
      if (lastMessage) {
        lastMessage.text += '\n' + result.continuation;
      }
      // If no previous message, we could track as error, but per spec
      // we just skip orphan continuation lines
    } else if ('error' in result) {
      if (result.error.reason === 'system_message') {
        systemMessagesFiltered++;
      } else {
        errors.push(result.error);
      }
    }
  }

  return {
    messages,
    detectedSpeakers: Array.from(speakerSet),
    errors,
    stats: {
      totalLines: lines.length,
      parsedCount: messages.length,
      errorCount: errors.length,
      systemMessagesFiltered,
    },
  };
}

// ============================================================================
// Mapping Function
// ============================================================================

/** Maximum characters per message to prevent abuse */
export const MAX_MESSAGE_LENGTH = 10000;

/** Maximum characters for raw line storage */
export const MAX_RAW_LINE_LENGTH = 12000;

/** Maximum number of messages per conversation */
export const MAX_MESSAGES_PER_CONVERSATION = 5000;

/**
 * Sanitize text to prevent storage abuse.
 * Truncates to max length and removes null bytes.
 */
function sanitizeText(text: string, maxLength: number): string {
  // Remove null bytes which can cause issues
  const cleaned = text.replace(/\0/g, '');
  return cleaned.slice(0, maxLength);
}

/**
 * Apply speaker mapping to parsed messages, converting to Message format.
 *
 * @param parsedMessages - Array of ParsedMessage from parser
 * @param mapping - User's speaker assignments (rawName -> Speaker)
 * @param conversationId - ID of the conversation these messages belong to
 * @returns Array of Message objects (without id, to be assigned by Firestore)
 */
export function applyMapping(
  parsedMessages: ParsedMessage[],
  mapping: SpeakerMapping,
  conversationId: string
): Omit<Message, 'id'>[] {
  // Limit number of messages to prevent abuse
  const limitedMessages = parsedMessages.slice(0, MAX_MESSAGES_PER_CONVERSATION);

  return limitedMessages.map((pm, index) => ({
    conversationId,
    speaker: (mapping[pm.speaker] || 'Unknown') as Speaker,
    text: sanitizeText(pm.text, MAX_MESSAGE_LENGTH),
    timestamp: pm.timestamp,
    originalRaw: sanitizeText(pm.rawLine, MAX_RAW_LINE_LENGTH),
    order: index,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  }));
}
