import * as vscode from 'vscode';
import { buildPreviewUrl } from '../sitecore/previewUrlBuilder';

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

export async function openInRenderingHost(input: unknown) {
  try {
    const itemPath = resolvePath(input);

    if (!itemPath) {
      vscode.window.showErrorMessage('Could not determine Sitecore item path.');
      return;
    }

    const config = vscode.workspace.getConfiguration('sitecoreCopilot');
    const renderingHost = config.get<string>('renderingHost') || 'http://localhost:3000';
    const contentRoot = config.get<string>('contentRoot') || '/sitecore/content';

    const previewUrl = buildPreviewUrl({
      itemPath,
      renderingHost,
      contentRoot,
    });

    await vscode.env.openExternal(vscode.Uri.parse(previewUrl));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Open in rendering host failed: ${message}`);
  }
}