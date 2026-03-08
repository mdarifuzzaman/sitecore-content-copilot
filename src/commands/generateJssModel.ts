import * as vscode from 'vscode';
import { getItemByPath } from '../sitecore/contentService';
import { generateJssFieldModel } from '../utils/jssMapper';

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

export async function generateJssModel(input: unknown) {
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

    const fields = item.fields ?? [];

    if (fields.length === 0) {
      vscode.window.showWarningMessage(
        `Item "${item.name}" does not contain any fields to generate a JSS model from.`
      );
      return;
    }

    const content = generateJssFieldModel(item.name, fields);

    const doc = await vscode.workspace.openTextDocument({
      content,
      language: 'typescript',
    });

    await vscode.window.showTextDocument(doc);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Generate JSS field model failed: ${message}`);
  }
}