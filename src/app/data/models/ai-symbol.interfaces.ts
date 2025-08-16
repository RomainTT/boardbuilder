export interface AiGenerationParams {
  prompt: string;
  num_images: number;
  steps: number;
}

export interface AiGenerationResponse {
  images: string[];
}

export interface StyleOptions {
  style: string;
  additionalText?: string;
  backgroundEnabled: boolean;
  outlinesEnabled: boolean;
  outlineWidth: number;
  saturation: string;
}

export interface PromptBuilderOptions {
  basePrompt: string;
  style: string;
  culture?: string;
  backgroundEnabled: boolean;
  outlinesEnabled: boolean;
  outlineWidth: number;
  saturation: string;
}

export interface AiImageToImageParams {
  image: string; // base64 encoded image
  prompt: string; // built prompt using buildPrompt()
  num_images: number;
  steps: number;
}