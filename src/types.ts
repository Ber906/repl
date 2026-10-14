export type FileMap = Record<string, string>;

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  display?: string;
  files?: FileMap;
  deleted?: string[];
  streaming?: boolean;
  error?: boolean;
}

export interface Project {
  id: string;
  name: string;
  files: FileMap;
  messages: ChatMessage[];
  updatedAt: number;
}

export interface Settings {
  apiKey: string;
  baseUrl: string;
  model: string;
  autoFix: boolean;
  temperature: number;
  maxTokens: number;
}

export interface LogLine {
  id: string;
  t: number;
  level: 'info' | 'warn' | 'error' | 'success';
  text: string;
}
