/**
 * Common Communication Patterns
 * 
 * Research-backed patterns from attachment theory, conflict research, 
 * cognitive behavioral therapy, and organizational psychology.
 * These are NOT personalized user patterns - they are general patterns 
 * that users can "bookmark" if they resonate.
 * 
 * Source frameworks:
 * - Gottman's Four Horsemen (criticism, contempt, defensiveness, stonewalling)
 * - Attachment Theory (anxious-preoccupied patterns)
 * - Nonviolent Communication (unmet needs under behaviors)
 * - Radical Candor (Kim Scott) - Care personally + challenge directly
 * - Crucial Conversations (Patterson et al) - Safety, mutual purpose
 * - Five Dysfunctions of a Team (Lencioni) - Trust, conflict, commitment
 * - Thinking Fast and Slow (Kahneman) - System 1/2, cognitive biases
 * - Leaders Eat Last (Sinek) - Circle of safety, trust chemicals
 * - Emotional Intelligence (Goleman) - Self-awareness, empathy
 * - Drive (Pink) - Autonomy, mastery, purpose
 * - The Culture Code (Coyle) - Safety signals, vulnerability loops
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

  // ==========================================
  // WORK-SPECIFIC PATTERNS
  // From organizational psychology research
  // ==========================================

  {
    id: 'ruinous-empathy',
    name: 'Ruinous Empathy',
    shortDescription: 'Being nice instead of being clear',
    longDescription:
      'You care about someone\'s feelings so much that you don\'t tell them what they need to hear. ' +
      'You soften feedback until it\'s meaningless. You think you\'re being kind, but you\'re actually ' +
      'denying them the chance to grow. As Kim Scott says: "It\'s not mean, it\'s clear."',
    examples: [
      '"It\'s fine, don\'t worry about it" (when it\'s not fine)',
      'Giving a 7/10 review when performance was 4/10',
      '"You did great!" followed by fixing their work yourself',
      'Avoiding the conversation entirely',
    ],
    underlyingNeed: 'To be liked, to avoid conflict, to protect their feelings',
    alternative:
      'Care personally AND challenge directly. "I\'m telling you this because I believe in you: ' +
      'here\'s what needs to change." Directness is a form of respect.',
    contexts: ['work'],
    icon: 'Heart',
  },
  {
    id: 'obnoxious-aggression',
    name: 'Brutal Honesty',
    shortDescription: 'Challenging directly without caring personally',
    longDescription:
      'You pride yourself on "telling it like it is." But without genuine care, directness becomes ' +
      'cruelty. People hear the criticism but not the belief in them. They get defensive or shut down. ' +
      'Your feedback doesn\'t land—it just wounds.',
    examples: [
      '"I\'m just being honest..."',
      'Criticizing in public "to make a point"',
      '"Someone had to say it"',
      'Focusing on what\'s wrong without acknowledging what\'s right',
    ],
    underlyingNeed: 'To be seen as competent, to maintain standards, to feel in control',
    alternative:
      'Lead with care, then challenge. "I know you can do better than this, and here\'s why it matters." ' +
      'Ask yourself: would I say this to someone I genuinely wanted to succeed?',
    contexts: ['work'],
    icon: 'Sword',
  },
  {
    id: 'artificial-harmony',
    name: 'Artificial Harmony',
    shortDescription: 'Avoiding conflict to keep the peace',
    longDescription:
      'Meetings end with head nods, but real opinions stay hidden. Disagreements happen in hallways ' +
      'and Slack DMs, never in the room where decisions are made. The team appears aligned but isn\'t. ' +
      'As Lencioni says: "If everything seems under control, you\'re not going fast enough."',
    examples: [
      'Staying silent in meetings, then complaining after',
      '"I guess that works..." (when it doesn\'t)',
      'Avoiding eye contact when you disagree',
      '"Let\'s just move on" before the real issue is addressed',
    ],
    underlyingNeed: 'Safety, belonging, fear of being seen as "difficult"',
    alternative:
      'Create safety for productive conflict. "I want to push back on this because I think we can do better. ' +
      'Here\'s my concern..." Disagreement in the room prevents resentment outside it.',
    contexts: ['work'],
    icon: 'Handshake',
  },
  {
    id: 'story-spinning',
    name: 'Spinning Stories',
    shortDescription: 'Filling in gaps with the worst interpretation',
    longDescription:
      'When you lack information, your brain fills the gap—usually with a threatening narrative. ' +
      '"They didn\'t cc me = they\'re cutting me out." "No response = they\'re upset." ' +
      'Kahneman calls this System 1 thinking: fast, automatic, and often wrong.',
    examples: [
      '"They didn\'t invite me to the meeting, so clearly..."',
      'Reading tone into a short email',
      '"She\'s probably thinking..."',
      'Assuming malice when it could be busyness',
    ],
    underlyingNeed: 'Certainty, to protect yourself from threat',
    alternative:
      'Engage System 2: slow down and reality-check. "What\'s the simplest explanation?" ' +
      'Or ask directly: "I noticed X and I\'m making up a story that Y. Is that accurate?"',
    contexts: ['work', 'romantic', 'family'],
    icon: 'BookOpen',
  },
  {
    id: 'safety-signaling-failure',
    name: 'Missing Safety Signals',
    shortDescription: 'Not showing you\'re on their side before delivering hard news',
    longDescription:
      'You jump straight to the problem without establishing shared purpose. Their brain goes into ' +
      'threat mode. They stop listening and start defending. As Patterson et al. found: ' +
      'when people feel unsafe, they either go silent or go violent.',
    examples: [
      'Starting with "We need to talk about your performance..."',
      'Leading with what\'s wrong instead of shared goals',
      'Forgetting to state mutual purpose',
      'Being right at the expense of being effective',
    ],
    underlyingNeed: 'Efficiency, urgency, being seen as competent',
    alternative:
      'Start with mutual purpose. "I want us both to succeed here, which is why I need to share something difficult. ' +
      'Can I give you some feedback?" Create safety first, then deliver truth.',
    contexts: ['work'],
    icon: 'Shield',
  },
  {
    id: 'autonomy-theft',
    name: 'Micromanaging',
    shortDescription: 'Controlling how, not just what',
    longDescription:
      'You specify not just the outcome but every step to get there. You check in constantly. ' +
      'You fix their work instead of coaching them. Dan Pink\'s research shows autonomy is a core motivator—' +
      'when you take it away, people disengage.',
    examples: [
      '"Do it exactly like this..."',
      'Checking in multiple times a day',
      'Redoing their work without explaining why',
      '"Let me just do it myself"',
    ],
    underlyingNeed: 'Control, certainty that it will be done right, reducing your own anxiety',
    alternative:
      'Define the "what" and "why," then let them figure out the "how." ' +
      '"Here\'s the outcome we need and why it matters. How would you approach it?" ' +
      'Coach on the gaps, don\'t fill them.',
    contexts: ['work'],
    icon: 'Eye',
  },
  {
    id: 'vulnerability-avoidance',
    name: 'Hiding Mistakes',
    shortDescription: 'Protecting your image instead of building trust',
    longDescription:
      'You cover up mistakes, spin failures, or stay silent when you don\'t know something. ' +
      'You think this protects your credibility—but it actually erodes trust. ' +
      'Daniel Coyle\'s research shows vulnerability loops are how teams build real trust.',
    examples: [
      '"That was the plan all along..."',
      'Blaming circumstances instead of owning the miss',
      'Pretending to know when you don\'t',
      'Hiding bad news until it becomes worse news',
    ],
    underlyingNeed: 'To be seen as competent, fear of judgment, protecting your position',
    alternative:
      'Model vulnerability. "I made a mistake here—here\'s what I learned." ' +
      '"I don\'t know the answer to that, but I\'ll find out." ' +
      'Vulnerability invites trust; perfection invites distance.',
    contexts: ['work'],
    icon: 'ShieldOff',
  },
  {
    id: 'fundamental-attribution-error',
    name: 'Blaming Character, Not Circumstances',
    shortDescription: 'Assuming they\'re the problem when it might be the situation',
    longDescription:
      'When they miss a deadline, they\'re unreliable. When you miss one, you had good reasons. ' +
      'This is the fundamental attribution error—we judge others by their actions but ourselves by our intentions. ' +
      'It poisons relationships and prevents real problem-solving.',
    examples: [
      '"They\'re just not a detail person"',
      '"They clearly don\'t care about quality"',
      '"That\'s just how they are"',
      'Labeling instead of understanding',
    ],
    underlyingNeed: 'To make sense of confusing behavior, to feel superior',
    alternative:
      'Ask about circumstances before judging character. "What got in the way?" ' +
      'Assume positive intent: "Given that they\'re generally reasonable, what might explain this?"',
    contexts: ['work', 'family'],
    icon: 'User',
  },
  {
    id: 'commitment-drift',
    name: 'Ambiguous Commitment',
    shortDescription: 'Leaving meetings without clear ownership',
    longDescription:
      'Everyone nods, but no one is actually committed. "We should..." becomes no one\'s job. ' +
      'Lencioni identifies this as a core dysfunction: without buy-in during the meeting, ' +
      'there\'s no follow-through after it.',
    examples: [
      '"Someone should probably..."',
      '"We\'ll figure it out"',
      'Leaving without clear next steps and owners',
      '"I thought you were handling that"',
    ],
    underlyingNeed: 'To avoid being the one who has to do it, to leave options open',
    alternative:
      'End every conversation with explicit commitment. "So to confirm: you\'ll do X by Y, and I\'ll do A by B. Agreed?" ' +
      'Disagree and commit: even if you have doubts, commit fully or speak up now.',
    contexts: ['work'],
    icon: 'CheckSquare',
  },
  {
    id: 'email-escalation',
    name: 'Fighting Over Email',
    shortDescription: 'Using text when you need voice',
    longDescription:
      'The email thread grows longer and colder. Each reply hardens positions. ' +
      'Without tone, your words land harsher than intended. Theirs seem hostile. ' +
      'What could be resolved in a 5-minute call becomes a week-long war.',
    examples: [
      'Reply-all battles',
      '"Per my last email..."',
      'CC\'ing managers to escalate',
      'Writing paragraphs when you need a phone call',
    ],
    underlyingNeed: 'To have a paper trail, to avoid real-time conflict, to feel in control',
    alternative:
      'Two volleys max. If it\'s not resolved in two emails, pick up the phone or walk over. ' +
      '"This is getting complex—can we sync for 5 minutes?" Tone travels better through voice.',
    contexts: ['work'],
    icon: 'Mail',
  },
  {
    id: 'credit-hoarding',
    name: 'Protecting Credit',
    shortDescription: 'Making sure people know it was you',
    longDescription:
      'You subtly (or not so subtly) make sure your contributions are visible. ' +
      'You use "I" when "we" would be accurate. Leaders who do this erode trust—' +
      'as Sinek says, great leaders eat last and take credit last.',
    examples: [
      '"As I mentioned in my proposal..."',
      '"I was the one who..."',
      'Cc\'ing managers on your wins',
      'Downplaying others\' contributions',
    ],
    underlyingNeed: 'Recognition, security, fear of being overlooked',
    alternative:
      'Give credit loudly, take blame quietly. "This was Sarah\'s insight." ' +
      'The credit will find you—and people will want to work with you again.',
    contexts: ['work'],
    icon: 'Award',
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
