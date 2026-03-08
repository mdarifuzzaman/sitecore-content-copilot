import * as vscode from 'vscode';

export async function runSetupWizard(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration('sitecoreCopilot');

  const endpoint = config.get<string>('endpoint');

  if (endpoint) {
    return;
  }

  const runSetup = await vscode.window.showInformationMessage(
    'Welcome to Sitecore Content Copilot. Configure your Sitecore connection?',
    'Setup',
    'Later'
  );

  if (runSetup !== 'Setup') {
    return;
  }

  const endpointInput = await vscode.window.showInputBox({
    prompt: 'Enter Sitecore GraphQL endpoint',
    placeHolder: 'https://your-xmcloud/graphql',
    ignoreFocusOut: true
  });

  if (!endpointInput) {
    return;
  }

  const apiKeyInput = await vscode.window.showInputBox({
    prompt: 'Enter Sitecore API Key',
    password: true,
    ignoreFocusOut: true
  });

  if (!apiKeyInput) {
    return;
  }

  const languageInput = await vscode.window.showInputBox({
    prompt: 'Language',
    value: 'en'
  });

  await config.update('endpoint', endpointInput, vscode.ConfigurationTarget.Global);
  await config.update('apiKey', apiKeyInput, vscode.ConfigurationTarget.Global);
  await config.update('language', languageInput || 'en', vscode.ConfigurationTarget.Global);

  vscode.window.showInformationMessage('Sitecore connection configured successfully.');
}