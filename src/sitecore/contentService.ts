import * as vscode from 'vscode';
import { sitecoreRequest } from './client';
import { ITEM_BY_PATH_QUERY, ITEM_CHILDREN_QUERY } from './queries';
import { ItemByPathResponse, ItemChildrenResponse, SitecoreItem } from './types';

function getSitecoreConfig() {
  const config = vscode.workspace.getConfiguration('sitecoreCopilot');
  const endpoint = config.get<string>('endpoint');
  const apiKey = config.get<string>('apiKey');
  const language = config.get<string>('language') || 'en';

  if (!endpoint) {
    throw new Error('Please run "Sitecore: Connect" first.');
  }

  return {
    endpoint,
    apiKey,
    language,
  };
}

export async function getItemByPath(path: string): Promise<SitecoreItem | null> {
  const { endpoint, apiKey, language } = getSitecoreConfig();

  const result = await sitecoreRequest<ItemByPathResponse>(
    endpoint,
    ITEM_BY_PATH_QUERY,
    { path, language },
    apiKey
  );

  return result.item;
}

export async function getItemChildren(path: string): Promise<SitecoreItem[]> {
  const { endpoint, apiKey, language } = getSitecoreConfig();

  const result = await sitecoreRequest<ItemChildrenResponse>(
    endpoint,
    ITEM_CHILDREN_QUERY,
    { path, language },
    apiKey
  );

  return result.item?.children?.results ?? [];
}