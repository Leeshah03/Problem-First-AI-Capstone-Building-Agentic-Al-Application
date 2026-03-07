import { z } from 'zod';

export const ClassificationResult = z.object({
  signalId: z.string(),
  themeAssignments: z.array(z.object({
    themeId: z.string(),
    relevance: z.number().min(0).max(1),
  })),
  summary: z.string().max(300),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().optional(),
  suggestedNewTheme: z.string().optional(),
});

export const ClassificationBatchResult = z.array(ClassificationResult);

export const BiasResult = z.object({
  signalId: z.string(),
  biasTag: z.enum(['INTERNAL', 'SOLUTION', 'WHALE', 'VOTE-STACK', 'CLEAN', 'COMPETITIVE', 'MISSING']),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

export const BiasBatchResult = z.array(BiasResult);

export function parseJsonFromAI(text) {
  // Extract JSON from markdown code blocks if present
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = codeBlockMatch ? codeBlockMatch[1].trim() : text.trim();
  return JSON.parse(jsonStr);
}

export function validateClassificationBatch(raw) {
  const parsed = typeof raw === 'string' ? parseJsonFromAI(raw) : raw;
  return ClassificationBatchResult.parse(parsed);
}

export function validateBiasBatch(raw) {
  const parsed = typeof raw === 'string' ? parseJsonFromAI(raw) : raw;
  return BiasBatchResult.parse(parsed);
}
