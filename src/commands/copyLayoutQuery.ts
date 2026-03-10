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

function inferSiteName(itemPath: string, contentRoot: string): string {
  const normalizedContentRoot = contentRoot.trim().replace(/\/+$/, '');
  const relativePath = itemPath.slice(normalizedContentRoot.length);
  const segments = relativePath.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);

  if (segments.length === 0) {
    throw new Error('Could not infer site name from item path.');
  }

  return segments[0];
}

export async function copyLayoutQuery(input: unknown) {
  try {
    const itemPath = resolvePath(input);

    if (!itemPath) {
      vscode.window.showErrorMessage('Could not determine Sitecore item path.');
      return;
    }

    const config = vscode.workspace.getConfiguration('sitecoreCopilot');
    const contentRoot = config.get<string>('contentRoot') || '/sitecore/content';
    const language = config.get<string>('language') || 'en';

    const routePath = buildRoutePath(itemPath, contentRoot);
    const siteName = inferSiteName(itemPath, contentRoot);

    const query = `query LayoutQuery($site: String!, $routePath: String!, $language: String!) {
  layout(site: $site, routePath: $routePath, language: $language) {
    item {
      rendered
    }
  }
}

# Variables
# {
#   "site": "${siteName}",
#   "routePath": "${routePath}",
#   "language": "${language}"
# }`;

    await vscode.env.clipboard.writeText(query);
    vscode.window.showInformationMessage(
      `Layout query copied for site "${siteName}" and route "${routePath}".`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Copy layout query failed: ${message}`);
  }
}