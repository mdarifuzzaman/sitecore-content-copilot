export type PersonalizeEvent = {
  type?: string;
  page?: string;
  name?: string;
  [key: string]: unknown;
};

export type TriggerAnalysisInput = {
  rule: string;
  events: PersonalizeEvent[];
  guest?: Record<string, unknown>;
};

export type TriggerAnalysisResult = {
  summary: string;
  matched: boolean;
  reasons: string[];
  suggestions: string[];
  details: {
    eventCount: number;
    distinctPages: string[];
    eventTypes: string[];
  };
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function getDistinctPages(events: PersonalizeEvent[]): string[] {
  const pages = events
    .map((event) => {
      if (typeof event.page === 'string' && event.page.trim()) {
        return event.page.trim();
      }

      const eventData = event.eventData as Record<string, unknown> | undefined;
      if (eventData && typeof eventData.page === 'string' && eventData.page.trim()) {
        return eventData.page.trim();
      }

      return undefined;
    })
    .filter((value): value is string => Boolean(value));

  return [...new Set(pages)];
}

function getEventTypes(events: PersonalizeEvent[]): string[] {
  const eventTypes = events
    .map((event) => (typeof event.type === 'string' ? event.type.trim() : ''))
    .filter(Boolean);

  return [...new Set(eventTypes)];
}

function analyzeDistinctPages(rule: string, events: PersonalizeEvent[]): TriggerAnalysisResult | null {
  const normalizedRule = normalize(rule);
  const match = normalizedRule.match(/(\d+)\s+distinct\s+pages?/);

  if (!match) {
    return null;
  }

  const requiredPages = Number(match[1]);
  const distinctPages = getDistinctPages(events);
  const matched = distinctPages.length >= requiredPages;

  const reasons: string[] = [];
  const suggestions: string[] = [];

  if (matched) {
    reasons.push(
      `The session contains ${distinctPages.length} distinct page(s), which satisfies the rule requiring ${requiredPages}.`
    );
  } else {
    reasons.push(
      `The session contains only ${distinctPages.length} distinct page(s), but the rule requires ${requiredPages}.`
    );

    if (distinctPages.length > 0) {
      reasons.push(`Distinct pages found: ${distinctPages.join(', ')}`);
    } else {
      reasons.push('No page values were detected in the event payloads.');
    }

    suggestions.push('Ensure page identifiers are present and consistent in the event payload.');
    suggestions.push('Check whether repeated page visits are being counted incorrectly as distinct visits.');
  }

  return {
    summary: matched
      ? 'Trigger condition satisfied for distinct page visits.'
      : 'Trigger condition not satisfied for distinct page visits.',
    matched,
    reasons,
    suggestions,
    details: {
      eventCount: events.length,
      distinctPages,
      eventTypes: getEventTypes(events),
    },
  };
}

function analyzeViewedSpecificPage(rule: string, events: PersonalizeEvent[]): TriggerAnalysisResult | null {
  const normalizedRule = normalize(rule);

  const pageMatch =
    normalizedRule.match(/viewed\s+page\s+["']?([^"']+)["']?/) ||
    normalizedRule.match(/visited\s+page\s+["']?([^"']+)["']?/);

  if (!pageMatch) {
    return null;
  }

  const expectedPage = pageMatch[1].trim();
  const distinctPages = getDistinctPages(events);
  const matched = distinctPages.some((page) => normalize(page) === normalize(expectedPage));

  const reasons: string[] = [];
  const suggestions: string[] = [];

  if (matched) {
    reasons.push(`The expected page "${expectedPage}" was found in the session events.`);
  } else {
    reasons.push(`The expected page "${expectedPage}" was not found in the session events.`);

    if (distinctPages.length > 0) {
      reasons.push(`Pages found: ${distinctPages.join(', ')}`);
    }

    suggestions.push('Verify the page value being sent in the VIEW event.');
    suggestions.push('Check for differences in page path formatting, casing, or trailing slashes.');
  }

  return {
    summary: matched
      ? 'Trigger condition satisfied for page visit.'
      : 'Trigger condition not satisfied for page visit.',
    matched,
    reasons,
    suggestions,
    details: {
      eventCount: events.length,
      distinctPages,
      eventTypes: getEventTypes(events),
    },
  };
}

function analyzeEventTypeExists(rule: string, events: PersonalizeEvent[]): TriggerAnalysisResult | null {
  const normalizedRule = normalize(rule);

  const eventMatch =
    normalizedRule.match(/event\s+type\s+["']?([^"']+)["']?/) ||
    normalizedRule.match(/contains\s+event\s+["']?([^"']+)["']?/) ||
    normalizedRule.match(/event\s+["']?([^"']+)["']?\s+exists/);

  if (!eventMatch) {
    return null;
  }

  const expectedType = eventMatch[1].trim();
  const eventTypes = getEventTypes(events);
  const matched = eventTypes.some((type) => normalize(type) === normalize(expectedType));

  const reasons: string[] = [];
  const suggestions: string[] = [];

  if (matched) {
    reasons.push(`The event type "${expectedType}" exists in the session.`);
  } else {
    reasons.push(`The event type "${expectedType}" was not found in the session.`);
    if (eventTypes.length > 0) {
      reasons.push(`Event types found: ${eventTypes.join(', ')}`);
    }
    suggestions.push('Verify the custom event name being emitted.');
    suggestions.push('Check whether the event is being sent in the same session where the experience is evaluated.');
  }

  return {
    summary: matched
      ? 'Trigger condition satisfied for event existence.'
      : 'Trigger condition not satisfied for event existence.',
    matched,
    reasons,
    suggestions,
    details: {
      eventCount: events.length,
      distinctPages: getDistinctPages(events),
      eventTypes,
    },
  };
}

function analyzeFallback(rule: string, events: PersonalizeEvent[]): TriggerAnalysisResult {
  const distinctPages = getDistinctPages(events);
  const eventTypes = getEventTypes(events);

  return {
    summary:
      'No specific built-in rule pattern matched. Showing a generic session analysis instead.',
    matched: false,
    reasons: [
      `Rule provided: ${rule}`,
      `Session contains ${events.length} event(s).`,
      `Distinct page count: ${distinctPages.length}.`,
      `Detected event types: ${eventTypes.length > 0 ? eventTypes.join(', ') : 'none'}.`,
    ],
    suggestions: [
      'Use a rule description like "user visits 3 distinct pages" for more precise analysis.',
      'Include page values on VIEW events and consistent event type names for better diagnostics.',
    ],
    details: {
      eventCount: events.length,
      distinctPages,
      eventTypes,
    },
  };
}

export function analyzeTrigger(input: TriggerAnalysisInput): TriggerAnalysisResult {
  return (
    analyzeDistinctPages(input.rule, input.events) ||
    analyzeViewedSpecificPage(input.rule, input.events) ||
    analyzeEventTypeExists(input.rule, input.events) ||
    analyzeFallback(input.rule, input.events)
  );
}

export function buildTriggerAnalysisMarkdown(
  input: TriggerAnalysisInput,
  result: TriggerAnalysisResult
): string {
  const guestKeys = Object.keys(input.guest ?? {});
  const distinctPagesText =
    result.details.distinctPages.length > 0
      ? result.details.distinctPages.map((page) => `- ${page}`).join('\n')
      : '- None';
  const eventTypesText =
    result.details.eventTypes.length > 0
      ? result.details.eventTypes.map((type) => `- ${type}`).join('\n')
      : '- None';

  return `# Personalize Trigger Analysis

## Rule
${input.rule}

## Summary
${result.matched ? '✅ Matched' : '❌ Not matched'}

${result.summary}

## Session Overview
- Event count: ${result.details.eventCount}
- Distinct pages: ${result.details.distinctPages.length}
- Event types: ${result.details.eventTypes.length}
- Guest attributes provided: ${guestKeys.length}

## Reasons
${result.reasons.map((reason) => `- ${reason}`).join('\n')}

## Suggestions
${result.suggestions.length > 0 ? result.suggestions.map((s) => `- ${s}`).join('\n') : '- No suggestions'}

## Distinct Pages
${distinctPagesText}

## Event Types
${eventTypesText}

## Guest Attribute Keys
${guestKeys.length > 0 ? guestKeys.map((key) => `- ${key}`).join('\n') : '- None'}
`;
}