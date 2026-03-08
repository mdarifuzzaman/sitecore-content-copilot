import * as vscode from 'vscode';
import { sitecoreRequest } from '../sitecore/client';

type ExplorerRequestMessage =
  | {
      type: 'runQuery';
      query: string;
      variablesText: string;
    }
  | {
      type: 'saveHistory';
      query: string;
      variablesText: string;
    }
  | {
      type: 'loadHistory';
      index: number;
    }
  | {
      type: 'getInitialState';
    };

type QueryHistoryItem = {
  query: string;
  variablesText: string;
  savedAt: string;
  label: string;
};

const HISTORY_KEY = 'sitecore.graphqlExplorer.history';
const MAX_HISTORY_ITEMS = 15;

export class GraphqlExplorerPanel {
  public static currentPanel: GraphqlExplorerPanel | undefined;

  private readonly panel: vscode.WebviewPanel;
  private readonly context: vscode.ExtensionContext;
  private readonly disposables: vscode.Disposable[] = [];
  private pendingInitialQuery?: string;
  private pendingInitialVariablesText?: string;

  public static createOrShow(
    context: vscode.ExtensionContext,
    initialState?: {
      query?: string;
      variablesText?: string;
    }
  ) {
    const column = vscode.window.activeTextEditor?.viewColumn;

    if (GraphqlExplorerPanel.currentPanel) {
      GraphqlExplorerPanel.currentPanel.panel.reveal(column);

      if (initialState) {
        GraphqlExplorerPanel.currentPanel.setInitialState(initialState);
      }

      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'sitecoreGraphqlExplorer',
      'Sitecore GraphQL Explorer',
      column ?? vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    GraphqlExplorerPanel.currentPanel = new GraphqlExplorerPanel(
      panel,
      context,
      initialState
    );
  }

  private constructor(
    panel: vscode.WebviewPanel,
    context: vscode.ExtensionContext,
    initialState?: {
      query?: string;
      variablesText?: string;
    }
  ) {
    this.panel = panel;
    this.context = context;
    this.pendingInitialQuery = initialState?.query;
    this.pendingInitialVariablesText = initialState?.variablesText;

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    this.panel.webview.html = this.getHtml(this.panel.webview);

    this.panel.webview.onDidReceiveMessage(
      async (message: ExplorerRequestMessage) => {
        switch (message.type) {
          case 'runQuery':
            await this.handleRunQuery(message.query, message.variablesText);
            break;
          case 'saveHistory':
            await this.handleSaveHistory(message.query, message.variablesText);
            break;
          case 'loadHistory':
            await this.handleLoadHistory(message.index);
            break;
          case 'getInitialState':
            await this.postInitialState();
            break;
        }
      },
      null,
      this.disposables
    );
  }

  public async setInitialState(initialState: {
    query?: string;
    variablesText?: string;
  }) {
    this.pendingInitialQuery = initialState.query;
    this.pendingInitialVariablesText = initialState.variablesText;

    await this.panel.webview.postMessage({
      type: 'prefillEditor',
      query: this.pendingInitialQuery ?? '',
      variablesText: this.pendingInitialVariablesText ?? '',
    });
  }

  public dispose() {
    GraphqlExplorerPanel.currentPanel = undefined;
    this.panel.dispose();

    while (this.disposables.length) {
      const item = this.disposables.pop();
      if (item) {
        item.dispose();
      }
    }
  }

  private async handleRunQuery(query: string, variablesText: string) {
    try {
      const config = vscode.workspace.getConfiguration('sitecoreCopilot');
      const endpoint = config.get<string>('endpoint');
      const apiKey = config.get<string>('apiKey');

      if (!endpoint) {
        await this.panel.webview.postMessage({
          type: 'queryResult',
          ok: false,
          error: 'No endpoint configured. Run "Sitecore: Connect" first.',
        });
        return;
      }

      let variables: Record<string, unknown> | undefined;

      if (variablesText.trim()) {
        variables = JSON.parse(variablesText);
      }

      const result = await sitecoreRequest<unknown>(
        endpoint,
        query,
        variables,
        apiKey
      );

      await this.panel.webview.postMessage({
        type: 'queryResult',
        ok: true,
        data: result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      await this.panel.webview.postMessage({
        type: 'queryResult',
        ok: false,
        error: message,
      });
    }
  }

  private async handleSaveHistory(query: string, variablesText: string) {
    const history = this.getHistory();

    const operationMatch = query.match(/\b(query|mutation)\s+([A-Za-z0-9_]+)/);
    const label =
      operationMatch?.[2] ??
      query.split('\n').find((line) => line.trim())?.trim() ??
      'Untitled Query';

    const newItem: QueryHistoryItem = {
      query,
      variablesText,
      savedAt: new Date().toISOString(),
      label,
    };

    const deduped = history.filter(
      (item) =>
        !(
          item.query.trim() === query.trim() &&
          item.variablesText.trim() === variablesText.trim()
        )
    );

    const nextHistory = [newItem, ...deduped].slice(0, MAX_HISTORY_ITEMS);

    await this.context.globalState.update(HISTORY_KEY, nextHistory);

    await this.panel.webview.postMessage({
      type: 'historyUpdated',
      history: nextHistory,
    });
  }

  private async handleLoadHistory(index: number) {
    const history = this.getHistory();
    const item = history[index];

    if (!item) {
      return;
    }

    await this.panel.webview.postMessage({
      type: 'historyLoaded',
      query: item.query,
      variablesText: item.variablesText,
    });
  }

  private async postInitialState() {
    const config = vscode.workspace.getConfiguration('sitecoreCopilot');
    const endpoint = config.get<string>('endpoint') || 'Not configured';
    const history = this.getHistory();

    await this.panel.webview.postMessage({
      type: 'initialState',
      endpoint,
      history,
      query: this.pendingInitialQuery ?? '',
      variablesText: this.pendingInitialVariablesText ?? '',
    });
  }

  private getHistory(): QueryHistoryItem[] {
    return (
      this.context.globalState.get<QueryHistoryItem[]>(HISTORY_KEY) ?? []
    );
  }

  private getHtml(webview: vscode.Webview): string {
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta
    http-equiv="Content-Security-Policy"
    content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';"
  />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sitecore GraphQL Explorer</title>
  <style>
    body {
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      margin: 0;
      padding: 16px;
    }

    .topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }

    .endpoint {
      font-size: 12px;
      opacity: 0.8;
      word-break: break-all;
    }

    .toolbar {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }

    .layout {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      height: calc(100vh - 120px);
    }

    .panel {
      display: flex;
      flex-direction: column;
      min-height: 0;
    }

    .label {
      font-size: 12px;
      margin-bottom: 8px;
      opacity: 0.8;
    }

    textarea, pre, select {
      width: 100%;
      box-sizing: border-box;
      border: 1px solid var(--vscode-input-border, #555);
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      padding: 12px;
      border-radius: 6px;
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 13px;
    }

    textarea, pre {
      flex: 1;
      resize: none;
      min-height: 0;
      overflow: auto;
      white-space: pre-wrap;
    }

    .vars {
      height: 140px;
      flex: unset;
      margin-top: 12px;
    }

    button {
      border: 1px solid var(--vscode-button-border, transparent);
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      padding: 8px 12px;
      border-radius: 6px;
      cursor: pointer;
    }

    button.secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
    }

    .status {
      margin-bottom: 8px;
      font-size: 12px;
      opacity: 0.85;
    }

    .history-wrap {
      display: flex;
      gap: 8px;
      align-items: center;
      margin-bottom: 12px;
    }

    .history-wrap select {
      flex: 1;
      padding: 8px;
    }
  </style>
</head>
<body>
  <div class="topbar">
    <div class="endpoint" id="endpointInfo">Endpoint: loading...</div>
    <div class="status" id="status">Ready</div>
  </div>

  <div class="history-wrap">
    <select id="historySelect">
      <option value="">History</option>
    </select>
    <button id="loadHistoryBtn" class="secondary">Load</button>
    <button id="saveHistoryBtn" class="secondary">Save</button>
  </div>

  <div class="toolbar">
    <button id="runBtn">Run</button>
    <button id="copyQueryBtn" class="secondary">Copy Query</button>
    <button id="copyResultBtn" class="secondary">Copy Result</button>
    <button id="formatVarsBtn" class="secondary">Format Variables</button>
    <button id="clearResultBtn" class="secondary">Clear Result</button>
  </div>

  <div class="layout">
    <div class="panel">
      <div class="label">Query</div>
      <textarea id="queryEditor">query GetHome($path: String!, $language: String!) {
  item(path: $path, language: $language) {
    id
    name
    path
  }
}</textarea>

      <div class="label" style="margin-top:12px;">Variables</div>
      <textarea id="variablesEditor" class="vars">{
  "path": "/sitecore/content/Home",
  "language": "en"
}</textarea>
    </div>

    <div class="panel">
      <div class="label">Result</div>
      <pre id="resultViewer">{}</pre>
    </div>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();

    const endpointInfo = document.getElementById('endpointInfo');
    const queryEditor = document.getElementById('queryEditor');
    const variablesEditor = document.getElementById('variablesEditor');
    const resultViewer = document.getElementById('resultViewer');
    const status = document.getElementById('status');
    const historySelect = document.getElementById('historySelect');

    const runBtn = document.getElementById('runBtn');
    const copyQueryBtn = document.getElementById('copyQueryBtn');
    const copyResultBtn = document.getElementById('copyResultBtn');
    const formatVarsBtn = document.getElementById('formatVarsBtn');
    const clearResultBtn = document.getElementById('clearResultBtn');
    const saveHistoryBtn = document.getElementById('saveHistoryBtn');
    const loadHistoryBtn = document.getElementById('loadHistoryBtn');

    let lastResult = '{}';

    function populateHistory(history) {
      historySelect.innerHTML = '<option value="">History</option>';

      history.forEach((item, index) => {
        const option = document.createElement('option');
        const date = new Date(item.savedAt).toLocaleString();
        option.value = String(index);
        option.textContent = item.label + ' — ' + date;
        historySelect.appendChild(option);
      });
    }

    function setStatus(text) {
      status.textContent = text;
    }

    function formatJsonText(text) {
      const parsed = JSON.parse(text || '{}');
      return JSON.stringify(parsed, null, 2);
    }

    runBtn.addEventListener('click', () => {
      setStatus('Running query...');
      resultViewer.textContent = '';

      vscode.postMessage({
        type: 'runQuery',
        query: queryEditor.value,
        variablesText: variablesEditor.value
      });
    });

    saveHistoryBtn.addEventListener('click', () => {
      vscode.postMessage({
        type: 'saveHistory',
        query: queryEditor.value,
        variablesText: variablesEditor.value
      });
      setStatus('Saved to history');
    });

    loadHistoryBtn.addEventListener('click', () => {
      if (!historySelect.value) {
        setStatus('Choose a history item first');
        return;
      }

      vscode.postMessage({
        type: 'loadHistory',
        index: Number(historySelect.value)
      });
    });

    copyQueryBtn.addEventListener('click', async () => {
      await navigator.clipboard.writeText(queryEditor.value);
      setStatus('Query copied');
    });

    copyResultBtn.addEventListener('click', async () => {
      await navigator.clipboard.writeText(lastResult);
      setStatus('Result copied');
    });

    formatVarsBtn.addEventListener('click', () => {
      try {
        variablesEditor.value = formatJsonText(variablesEditor.value);
        setStatus('Variables formatted');
      } catch {
        setStatus('Variables JSON is invalid');
      }
    });

    clearResultBtn.addEventListener('click', () => {
      resultViewer.textContent = '{}';
      lastResult = '{}';
      setStatus('Result cleared');
    });

    window.addEventListener('keydown', (event) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const runShortcut = isMac ? event.metaKey : event.ctrlKey;

      if (runShortcut && event.key === 'Enter') {
        event.preventDefault();
        runBtn.click();
      }
    });

    window.addEventListener('message', event => {
      const message = event.data;

      if (message.type === 'queryResult') {
        if (message.ok) {
          setStatus('Success');
          lastResult = JSON.stringify(message.data, null, 2);
          resultViewer.textContent = lastResult;
        } else {
          setStatus('Error');
          lastResult = message.error;
          resultViewer.textContent = message.error;
        }
      }

      if (message.type === 'initialState') {
        endpointInfo.textContent = 'Endpoint: ' + message.endpoint;
        populateHistory(message.history || []);

        if (message.query) {
          queryEditor.value = message.query;
        }

        if (message.variablesText) {
          variablesEditor.value = message.variablesText;
        }
      }
      
      if (message.type === 'prefillEditor') {
        if (message.query) {
          queryEditor.value = message.query;
        }

        if (message.variablesText) {
          variablesEditor.value = message.variablesText;
        }

        setStatus('Editor prefilled');
      }

      if (message.type === 'historyUpdated') {
        populateHistory(message.history || []);
      }

      if (message.type === 'historyLoaded') {
        queryEditor.value = message.query || '';
        variablesEditor.value = message.variablesText || '';
        setStatus('History item loaded');
      }
    });

    vscode.postMessage({ type: 'getInitialState' });
  </script>
</body>
</html>`;
  }
}

function getNonce() {
  let text = '';
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  return text;
}