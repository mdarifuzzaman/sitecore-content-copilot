import * as vscode from 'vscode';
import {
  analyzeTrigger,
  buildTriggerAnalysisMarkdown,
  PersonalizeEvent,
} from '../personalize/triggerAnalyzer';

function parseJsonObject(text: string): Record<string, unknown> | undefined {
  const trimmed = text.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = JSON.parse(trimmed);

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Expected a JSON object.');
  }

  return parsed as Record<string, unknown>;
}

function parseEvents(text: string): PersonalizeEvent[] {
  const parsed = JSON.parse(text);

  if (!Array.isArray(parsed)) {
    throw new Error('Events input must be a JSON array.');
  }

  return parsed as PersonalizeEvent[];
}

export async function analyzePersonalizeTrigger() {
  try {
    const rule = await vscode.window.showInputBox({
      prompt: 'Describe the Personalize rule',
      placeHolder: 'Example: user visits 3 distinct pages',
      ignoreFocusOut: true,
    });

    if (!rule) {
      return;
    }

    const eventsInput = await vscode.window.showInputBox({
      prompt: 'Paste session events JSON array',
      placeHolder:
        '[{"type":"VIEW","page":"/home"},{"type":"VIEW","page":"/products"}]',
      ignoreFocusOut: true,
    });

    if (!eventsInput) {
      return;
    }

    const guestInput = await vscode.window.showInputBox({
      prompt: 'Paste guest JSON object (optional)',
      placeHolder: '{"registrationDate":"2026-01-10"}',
      ignoreFocusOut: true,
    });

    const events = parseEvents(eventsInput);
    const guest = guestInput ? parseJsonObject(guestInput) : undefined;

    const input = {
      rule,
      events,
      guest,
    };

    const result = analyzeTrigger(input);
    const markdown = buildTriggerAnalysisMarkdown(input, result);

    const doc = await vscode.workspace.openTextDocument({
      content: markdown,
      language: 'markdown',
    });

    await vscode.window.showTextDocument(doc);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Analyze Personalize Trigger failed: ${message}`);
  }
}