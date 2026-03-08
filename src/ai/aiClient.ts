import * as vscode from 'vscode';

type AiResponse = {
  content: string;
};

export async function generateAiText(prompt: string): Promise<AiResponse> {
  const config = vscode.workspace.getConfiguration('sitecoreCopilot');

  const enabled = config.get<boolean>('aiEnabled');
  const apiKey = config.get<string>('aiApiKey');
  const model = config.get<string>('aiModel') || 'gpt-5';

  if (!enabled) {
    throw new Error('AI features are disabled. Enable sitecoreCopilot.aiEnabled first.');
  }

  if (!apiKey) {
    throw new Error('AI API key is missing. Set sitecoreCopilot.aiApiKey.');
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: prompt,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed: HTTP ${response.status} - ${errorText}`);
  }

  const json: any = await response.json();

  const content =
    json?.output_text ??
    json?.output?.[0]?.content?.[0]?.text ??
    '';

  if (!content) {
    throw new Error('OpenAI response did not contain usable text.');
  }

  return { content };
}