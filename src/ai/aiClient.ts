import * as vscode from 'vscode';

type AiResponse = {
  content: string;
};

export async function generateAiText(prompt: string): Promise<AiResponse> {
  const config = vscode.workspace.getConfiguration('sitecoreCopilot');

  const enabled = config.get<boolean>('aiEnabled');
  const endpoint = config.get<string>('aiEndpoint');
  const apiKey = config.get<string>('aiApiKey');
  const model = config.get<string>('aiModel');

  if (!enabled) {
    throw new Error('AI features are disabled. Enable sitecoreCopilot.aiEnabled first.');
  }

  if (!endpoint || !apiKey || !model) {
    throw new Error(
      'AI is not configured. Please set aiEndpoint, aiApiKey, and aiModel.'
    );
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      prompt,
    }),
  });

  if (!response.ok) {
    throw new Error(`AI request failed: HTTP ${response.status}`);
  }

  const json: any = await response.json();

  const content =
    json?.content ??
    json?.text ??
    json?.output ??
    json?.choices?.[0]?.message?.content ??
    '';

  if (!content) {
    throw new Error('AI response did not contain usable content.');
  }

  return { content };
}