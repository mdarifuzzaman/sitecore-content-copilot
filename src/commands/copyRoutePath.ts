import * as vscode from 'vscode';
import { buildRoutePath } from '../sitecore/previewUrlBuilder';

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

export async function copyRoutePath(input: unknown) {
  try {
    const itemPath = resolvePath(input);

    if (!itemPath) {
      vscode.window.showErrorMessage('Could not determine Sitecore item path.');
      return;
    }

    const config = vscode.workspace.getConfiguration('sitecoreCopilot');
    const contentRoot = config.get<string>('contentRoot') || '/sitecore/content';

    const routePath = buildRoutePath(itemPath, contentRoot);

    await vscode.env.clipboard.writeText(routePath);
    vscode.window.showInformationMessage(`Route path copied: ${routePath}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Copy route path failed: ${message}`);
  }
}