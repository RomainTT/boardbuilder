import { StyleConfig, StyleUiState } from '@data/services/ai-symbol-state.service';

export interface AiGenerationParams {
  prompt: string;
  num_images: number;
  steps: number;
}

export interface AiGenerationResponse {
  image_urls: string[];
}

export interface AiImageToImageParams {
  image: string; // base64 encoded image
  prompt: string; // built prompt using buildPrompt()
  num_images: number;
  steps: number;
}

export interface PromptOptions {
  mode: 'text' | 'image';
  userPrompt: string;
  styleState: StyleUiState;
  styleConfig?: StyleConfig;
}