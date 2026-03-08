import * as vscode from 'vscode';

export type SitecoreConnection = {
  endpoint: string;
  apiKey?: string;
};

const CONFIG_SECTION = 'sitecoreCopilot';

export function getConnectionConfig(): SitecoreConnection | undefined {
  const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
  const endpoint = config.get<string>('endpoint');
  const apiKey = config.get<string>('apiKey');

  if (!endpoint) return undefined;

  return { endpoint, apiKey };
}

export async function saveConnectionConfig(endpoint: string, apiKey?: string) {
  const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
  await config.update('endpoint', endpoint, vscode.ConfigurationTarget.Global);
  await config.update('apiKey', apiKey, vscode.ConfigurationTarget.Global);
}