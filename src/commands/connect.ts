import * as vscode from 'vscode';

export async function connectSitecore() {
  const endpoint = await vscode.window.showInputBox({
    prompt: 'Enter Sitecore GraphQL endpoint',
    placeHolder: 'https://your-site/sitecore/api/graph/edge',
    ignoreFocusOut: true,
  });

  if (!endpoint) {
    return;
  }

  const apiKey = await vscode.window.showInputBox({
    prompt: 'Enter Sitecore API key (optional)',
    password: true,
    ignoreFocusOut: true,
  });

  const language = await vscode.window.showInputBox({
    prompt: 'Default language',
    value: 'en',
    ignoreFocusOut: true,
  });

  const config = vscode.workspace.getConfiguration('sitecoreCopilot');

  await config.update('endpoint', endpoint, vscode.ConfigurationTarget.Global);
  await config.update('apiKey', apiKey || '', vscode.ConfigurationTarget.Global);
  await config.update('language', language || 'en', vscode.ConfigurationTarget.Global);

  vscode.window.showInformationMessage('Sitecore connection saved.');
}