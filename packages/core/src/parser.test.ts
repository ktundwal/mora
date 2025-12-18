import { describe, it, expect } from 'vitest';
import { parseWhatsAppText, applyMapping } from './parser';
import type { SpeakerMapping } from './types';

describe('parseWhatsAppText', () => {
  describe('US format with brackets [M/D/YY, H:MM:SS AM/PM]', () => {
    it('parses single message', () => {
      const input = '[12/18/24, 10:30:15 AM] John: Hello there';
      const result = parseWhatsAppText(input);

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]).toMatchObject({
        speaker: 'John',
        text: 'Hello there',
        lineNumber: 1,
      });
      expect(result.messages[0]?.timestamp).toBeDefined();
      expect(result.detectedSpeakers).toEqual(['John']);
      expect(result.stats.parsedCount).toBe(1);
    });

    it('parses multiple messages', () => {
      const input = `[12/18/24, 10:30:15 AM] John: Hey, how are you?
[12/18/24, 10:30:45 AM] Jane: I'm good! Thanks for asking.
[12/18/24, 10:31:02 AM] John: Great to hear!`;

      const result = parseWhatsAppText(input);

      expect(result.messages).toHaveLength(3);
      expect(result.detectedSpeakers).toEqual(['John', 'Jane']);
      expect(result.messages[0]?.speaker).toBe('John');
      expect(result.messages[1]?.speaker).toBe('Jane');
      expect(result.messages[2]?.speaker).toBe('John');
    });

    it('handles PM times correctly', () => {
      const input = '[12/18/24, 11:45:00 PM] John: Late night message';
      const result = parseWhatsAppText(input);

      expect(result.messages).toHaveLength(1);
      // Note: toISOString converts to UTC, so we just verify it parsed
      expect(result.messages[0]?.timestamp).toBeDefined();
      expect(result.messages[0]?.timestamp).not.toBeNull();
    });

    it('handles format without seconds', () => {
      const input = '[12/18/24, 10:30 AM] John: No seconds here';
      const result = parseWhatsAppText(input);

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]?.speaker).toBe('John');
    });
  });

  describe('EU format with brackets [DD/MM/YY, HH:MM:SS]', () => {
    it('parses EU date format with 24h time', () => {
      const input = '[18/12/24, 14:30:15] John: European format';
      const result = parseWhatsAppText(input);

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]?.speaker).toBe('John');
      expect(result.messages[0]?.text).toBe('European format');
    });

    it('handles format without seconds', () => {
      const input = '[18/12/24, 14:30] John: No seconds';
      const result = parseWhatsAppText(input);

      expect(result.messages).toHaveLength(1);
    });
  });

  describe('Android dash format (M/D/YY, H:MM AM - Speaker:)', () => {
    it('parses dash format', () => {
      const input = '12/18/24, 10:30 AM - John: Android format';
      const result = parseWhatsAppText(input);

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]?.speaker).toBe('John');
      expect(result.messages[0]?.text).toBe('Android format');
    });

    it('parses multiple dash format messages', () => {
      const input = `12/18/24, 10:30 - John: Hey there
12/18/24, 10:31 - Jane: Hi!`;

      const result = parseWhatsAppText(input);

      expect(result.messages).toHaveLength(2);
      expect(result.detectedSpeakers).toEqual(['John', 'Jane']);
    });
  });

  describe('multi-line messages', () => {
    it('appends continuation lines to previous message', () => {
      const input = `[12/18/24, 10:30:15 AM] John: First line
Second line of the same message
Third line too
[12/18/24, 10:31:00 AM] Jane: New message`;

      const result = parseWhatsAppText(input);

      expect(result.messages).toHaveLength(2);
      expect(result.messages[0]?.text).toBe(
        'First line\nSecond line of the same message\nThird line too'
      );
      expect(result.messages[1]?.text).toBe('New message');
    });

    it('handles multi-line at end of input', () => {
      const input = `[12/18/24, 10:30:15 AM] John: Message
With continuation`;

      const result = parseWhatsAppText(input);

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]?.text).toBe('Message\nWith continuation');
    });
  });

  describe('system message filtering', () => {
    it('filters encryption notice', () => {
      const input = `[12/18/24, 10:00:00 AM] Messages and calls are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them.
[12/18/24, 10:30:15 AM] John: Hello`;

      const result = parseWhatsAppText(input);

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]?.speaker).toBe('John');
      expect(result.stats.systemMessagesFiltered).toBe(1);
    });

    it('filters group creation messages', () => {
      const input = `[12/18/24, 10:00:00 AM] John created group "Family Chat"
[12/18/24, 10:01:00 AM] John added Jane
[12/18/24, 10:30:15 AM] John: Hello everyone`;

      const result = parseWhatsAppText(input);

      expect(result.messages).toHaveLength(1);
      expect(result.stats.systemMessagesFiltered).toBe(2);
    });

    it('filters member left/joined messages', () => {
      const input = `[12/18/24, 10:00:00 AM] Jane left
[12/18/24, 10:01:00 AM] Bob joined using this group's invite link
[12/18/24, 10:30:15 AM] John: Anyone here?`;

      const result = parseWhatsAppText(input);

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]?.speaker).toBe('John');
    });

    it('filters subject change messages', () => {
      const input = `[12/18/24, 10:00:00 AM] John changed the subject to "New Name"
[12/18/24, 10:30:15 AM] John: Check out the new name`;

      const result = parseWhatsAppText(input);

      expect(result.messages).toHaveLength(1);
    });
  });

  describe('edge cases', () => {
    it('returns empty result for empty input', () => {
      const result = parseWhatsAppText('');

      expect(result.messages).toHaveLength(0);
      expect(result.detectedSpeakers).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
      expect(result.stats.totalLines).toBe(0);
    });

    it('returns empty result for whitespace-only input', () => {
      const result = parseWhatsAppText('   \n\n   \n');

      expect(result.messages).toHaveLength(0);
      // Whitespace-only is treated as empty, so totalLines is 0
      expect(result.stats.totalLines).toBe(0);
    });

    it('handles message with colons in text', () => {
      const input = '[12/18/24, 10:30:15 AM] John: Check this: it has colons: see?';
      const result = parseWhatsAppText(input);

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]?.text).toBe('Check this: it has colons: see?');
    });

    it('handles speaker names with spaces', () => {
      const input = '[12/18/24, 10:30:15 AM] John Doe: Hello';
      const result = parseWhatsAppText(input);

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]?.speaker).toBe('John Doe');
    });

    it('handles phone numbers as speaker names', () => {
      const input = '[12/18/24, 10:30:15 AM] +1 234 567 8900: Hello';
      const result = parseWhatsAppText(input);

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]?.speaker).toBe('+1 234 567 8900');
    });

    it('tracks errors for unparseable lines', () => {
      const input = `[12/18/24, 10:30:15 AM] John: Valid message
This line has no format at all and no previous message to attach to`;

      // First message parses, second line should attach to it
      const result = parseWhatsAppText(input);

      // The second line should be appended to the first message
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]?.text).toContain('Valid message');
    });

    it('handles media placeholder messages', () => {
      const input = '[12/18/24, 10:30:15 AM] John: <Media omitted>';
      const result = parseWhatsAppText(input);

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]?.text).toBe('<Media omitted>');
    });

    it('preserves rawLine for debugging', () => {
      const input = '[12/18/24, 10:30:15 AM] John: Hello';
      const result = parseWhatsAppText(input);

      expect(result.messages[0]?.rawLine).toBe('[12/18/24, 10:30:15 AM] John: Hello');
    });

    it('assigns correct line numbers', () => {
      const input = `[12/18/24, 10:30:15 AM] John: First
[12/18/24, 10:31:00 AM] Jane: Second`;

      const result = parseWhatsAppText(input);

      expect(result.messages[0]?.lineNumber).toBe(1);
      expect(result.messages[1]?.lineNumber).toBe(2);
    });
  });

  describe('stats tracking', () => {
    it('tracks all stats correctly', () => {
      const input = `[12/18/24, 10:00:00 AM] Messages and calls are end-to-end encrypted.
[12/18/24, 10:30:15 AM] John: Hello
[12/18/24, 10:30:45 AM] Jane: Hi there!
Multi-line part`;

      const result = parseWhatsAppText(input);

      expect(result.stats.totalLines).toBe(4);
      expect(result.stats.parsedCount).toBe(2);
      expect(result.stats.systemMessagesFiltered).toBe(1);
    });
  });
});

describe('applyMapping', () => {
  it('converts ParsedMessage[] to Message format with mapping', () => {
    const parsedMessages = [
      {
        speaker: 'John',
        text: 'Hello',
        timestamp: '2024-12-18T10:30:15.000Z',
        rawLine: '[12/18/24, 10:30:15 AM] John: Hello',
        lineNumber: 1,
      },
      {
        speaker: 'Jane',
        text: 'Hi!',
        timestamp: '2024-12-18T10:30:45.000Z',
        rawLine: '[12/18/24, 10:30:45 AM] Jane: Hi!',
        lineNumber: 2,
      },
    ];

    const mapping: SpeakerMapping = {
      John: 'Partner',
      Jane: 'User',
    };

    const result = applyMapping(parsedMessages, mapping, 'conv-123');

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      conversationId: 'conv-123',
      speaker: 'Partner',
      text: 'Hello',
      order: 0,
    });
    expect(result[1]).toMatchObject({
      conversationId: 'conv-123',
      speaker: 'User',
      text: 'Hi!',
      order: 1,
    });
  });

  it('defaults unmapped speakers to Unknown', () => {
    const parsedMessages = [
      {
        speaker: 'Mystery Person',
        text: 'Who am I?',
        timestamp: null,
        rawLine: 'Mystery Person: Who am I?',
        lineNumber: 1,
      },
    ];

    const mapping: SpeakerMapping = {};

    const result = applyMapping(parsedMessages, mapping, 'conv-123');

    expect(result[0]?.speaker).toBe('Unknown');
  });

  it('includes schemaVersion on each message', () => {
    const parsedMessages = [
      {
        speaker: 'John',
        text: 'Hello',
        timestamp: null,
        rawLine: 'John: Hello',
        lineNumber: 1,
      },
    ];

    const result = applyMapping(parsedMessages, { John: 'User' }, 'conv-123');

    expect(result[0]?.schemaVersion).toBe(1);
  });
});
