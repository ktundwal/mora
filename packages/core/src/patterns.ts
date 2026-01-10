/**
 * Common Communication Patterns
 * 
 * Research-backed patterns from attachment theory, conflict research, and 
 * cognitive behavioral therapy. These are NOT personalized user patterns -
 * they are general patterns that users can "bookmark" if they resonate.
 * 
 * Source frameworks:
 * - Gottman's Four Horsemen (criticism, contempt, defensiveness, stonewalling)
 * - Attachment Theory (anxious-preoccupied patterns)
 * - Nonviolent Communication (unmet needs under behaviors)
 */

export interface CommonPattern {
  id: string;
  name: string;
  shortDescription: string;
  longDescription: string;
  /** What it looks like in behavior */
  examples: string[];
  /** The unmet need underneath */
  underlyingNeed: string;
  /** What to try instead */
  alternative: string;
  /** Which contexts this is most relevant for */
  contexts: ('romantic' | 'family' | 'work' | 'friendship')[];
  /** Icon hint for UI (lucide icon name) */
  icon: string;
}

/**
 * Research-backed common patterns.
 * Users can bookmark ones that resonate → seed data for MIRA later.
 */
export const COMMON_PATTERNS: CommonPattern[] = [
  {
    id: 'over-explaining',
    name: 'Over-Explaining',
    shortDescription: 'Defending yourself with logic when they need to feel heard',
    longDescription: 
      'When criticized or in conflict, you explain your reasoning in detail. ' +
      'The more they push back, the more you explain. But they don\'t need to understand ' +
      'your logic—they need to feel understood.',
    examples: [
      '"I only said that because..."',
      '"Let me explain why I did that..."',
      '"You\'re not understanding, what I meant was..."',
    ],
    underlyingNeed: 'To be seen as reasonable and good-intentioned',
    alternative: 
      'Pause the explanation. Acknowledge their feeling first: "I can see this hurt you." ' +
      'Your logic can wait.',
    contexts: ['romantic', 'family', 'work'],
    icon: 'MessageSquareMore',
  },
  {
    id: 'reassurance-seeking',
    name: 'Asking for Reassurance',
    shortDescription: 'Needing them to confirm the relationship is okay',
    longDescription:
      'After conflict or silence, you ask "Are we okay?" or "Are you mad?" ' +
      'The relief is temporary. The anxiety returns. The question becomes a pattern.',
    examples: [
      '"Are we okay?"',
      '"Are you still upset?"',
      '"Do you still love me?"',
      '"Just tell me we\'re fine and I\'ll drop it"',
    ],
    underlyingNeed: 'Safety and certainty in the relationship',
    alternative:
      'Sit with the discomfort. They\'ll show you they\'re okay through actions. ' +
      'If you must ask, ask once and trust the answer.',
    contexts: ['romantic', 'family'],
    icon: 'HelpCircle',
  },
  {
    id: 'withdrawing',
    name: 'Going Silent',
    shortDescription: 'Pulling away instead of saying what\'s wrong',
    longDescription:
      'When hurt or overwhelmed, you go quiet. You might say "I\'m fine" when you\'re not. ' +
      'The silence protects you but confuses them. They can\'t fix what they can\'t see.',
    examples: [
      'Short replies: "K", "Fine", "Whatever"',
      'Leaving the room mid-conversation',
      'Taking hours to respond when upset',
      '"I don\'t want to talk about it"',
    ],
    underlyingNeed: 'Space to process, protection from more hurt',
    alternative:
      'Name it: "I need 20 minutes to think, then I\'ll come back." ' +
      'Give them something to hold onto while you process.',
    contexts: ['romantic', 'family', 'work'],
    icon: 'VolumeX',
  },
  {
    id: 'ledgering',
    name: 'Keeping Score',
    shortDescription: 'Bringing up past wrongs during current conflicts',
    longDescription:
      'In a disagreement, you reference something they did before: "Well, you did X last month." ' +
      'It feels like evidence, but it derails the current issue and makes them defensive.',
    examples: [
      '"This is just like when you..."',
      '"You always do this"',
      '"Remember when you..."',
      '"That\'s rich coming from someone who..."',
    ],
    underlyingNeed: 'To feel like your grievances are valid and remembered',
    alternative:
      'Stay in the present conflict. Write down past hurts separately. ' +
      'Address them in a calm moment, not as ammunition.',
    contexts: ['romantic', 'family'],
    icon: 'Scale',
  },
  {
    id: 'mind-reading',
    name: 'Assuming Intent',
    shortDescription: 'Deciding you know why they did something',
    longDescription:
      'You fill in their motivations: "You did that because you don\'t care." ' +
      'But you\'re guessing. And you\'re usually guessing wrong—projecting your fears onto their actions.',
    examples: [
      '"You obviously don\'t respect my time"',
      '"You just want to hurt me"',
      '"You knew this would upset me and did it anyway"',
    ],
    underlyingNeed: 'Certainty about where you stand with them',
    alternative:
      'Replace "You did X because..." with "When X happened, I felt... Was that your intention?" ' +
      'Ask before concluding.',
    contexts: ['romantic', 'family', 'work'],
    icon: 'Brain',
  },
  {
    id: 'fixing-before-feeling',
    name: 'Jumping to Solutions',
    shortDescription: 'Offering fixes when they need to vent',
    longDescription:
      'They share a problem and you immediately suggest solutions. ' +
      'It feels helpful, but they might just need to be heard. Fixing can feel like dismissing.',
    examples: [
      '"Have you tried..."',
      '"Why don\'t you just..."',
      '"Here\'s what you should do..."',
    ],
    underlyingNeed: 'To feel useful and reduce their (and your) discomfort',
    alternative:
      'Ask: "Do you want me to help problem-solve, or do you need to vent?" ' +
      'Let them choose.',
    contexts: ['romantic', 'family', 'work', 'friendship'],
    icon: 'Wrench',
  },
  {
    id: 'all-or-nothing',
    name: 'Black-and-White Thinking',
    shortDescription: 'Seeing situations as completely good or bad',
    longDescription:
      'One mistake and the whole day/relationship/project is ruined. ' +
      '"You never..." or "You always..." Everything is extreme.',
    examples: [
      '"You never listen to me"',
      '"This always happens"',
      '"Everything is ruined now"',
      '"I can\'t do anything right"',
    ],
    underlyingNeed: 'Clarity in ambiguous emotional situations',
    alternative:
      'Replace "always/never" with "sometimes" or "in this instance." ' +
      'Notice the gray between black and white.',
    contexts: ['romantic', 'family', 'work'],
    icon: 'Contrast',
  },
  {
    id: 'premature-apology',
    name: 'Apologizing Too Fast',
    shortDescription: 'Saying sorry to end the discomfort, not because you understand',
    longDescription:
      'Conflict is uncomfortable, so you apologize quickly to make it stop. ' +
      'But they can tell you don\'t really understand what hurt them. The apology feels hollow.',
    examples: [
      '"Fine, I\'m sorry, okay?"',
      '"I said sorry, what more do you want?"',
      'Apologizing before they\'ve finished explaining',
    ],
    underlyingNeed: 'To escape the discomfort of their hurt/anger',
    alternative:
      'Let them finish. Ask what specifically hurt. Then apologize for that specific thing. ' +
      '"I\'m sorry that when I did X, it made you feel Y."',
    contexts: ['romantic', 'family', 'work'],
    icon: 'FastForward',
  },
];

/**
 * Get patterns relevant to a specific context
 */
export function getPatternsForContext(
  context: 'romantic' | 'family' | 'work' | 'friendship'
): CommonPattern[] {
  return COMMON_PATTERNS.filter(p => p.contexts.includes(context));
}

/**
 * Get a pattern by ID
 */
export function getPatternById(id: string): CommonPattern | undefined {
  return COMMON_PATTERNS.find(p => p.id === id);
}
