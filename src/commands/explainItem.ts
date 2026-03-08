import * as vscode from 'vscode';
import { getItemByPath } from '../sitecore/contentService';
import { buildExplainItemPrompt } from '../ai/promptBuilder';
import { generateAiText } from '../ai/aiClient';

function resolvePath(input: unknown): string | undefined {
  if (typeof input === 'string') {
    return input;
  }

  if (input && typeof input === 'object' && 'itemPath' in input) {
    const maybePath = (input as { itemPath?: unknown }).itemPath;
    if (typeof maybePath === 'string') {
      return maybePath;
    }
  }

  return undefined;
}

export async function explainItem(input: unknown) {
  try {
    const path = resolvePath(input);

    if (!path) {
      vscode.window.showErrorMessage('Could not determine Sitecore item path.');
      return;
    }

    const item = await getItemByPath(path);

    if (!item) {
      vscode.window.showWarningMessage(`No Sitecore item found for path: ${path}`);
      return;
    }

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Explaining "${item.name}" with AI...`,
        cancellable: false,
      },
      async () => {
        const prompt = buildExplainItemPrompt(item);
        const result = await generateAiText(prompt);

        const doc = await vscode.workspace.openTextDocument({
          content: result.content,
          language: 'markdown',
        });

        await vscode.window.showTextDocument(doc);
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Explain item failed: ${message}`);
  }
}