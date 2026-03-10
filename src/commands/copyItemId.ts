import * as vscode from 'vscode';
import { getItemByPath } from '../sitecore/contentService';

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

export async function copyItemId(input: unknown) {
  try {
    const path = resolvePath(input);

    if (!path) {
      vscode.window.showErrorMessage('Could not determine Sitecore item path.');
      return;
    }

    const item = await getItemByPath(path);

    if (!item?.id) {
      vscode.window.showWarningMessage(`No Sitecore item ID found for path: ${path}`);
      return;
    }

    await vscode.env.clipboard.writeText(item.id);
    vscode.window.showInformationMessage(`Item ID copied: ${item.id}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Copy item ID failed: ${message}`);
  }
}