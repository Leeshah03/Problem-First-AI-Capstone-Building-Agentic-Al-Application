export function buildClassificationPrompt(signals, themes) {
  const themeList = themes.map(t =>
    `- ID: "${t.id}" | Name: "${t.name}" | Area: ${t.product_area || 'N/A'} | Goal: ${t.strategic_goal || 'N/A'} | Description: ${t.description || 'N/A'}`
  ).join('\n');

  const signalList = JSON.stringify(signals.map(s => ({
    id: s.id,
    source: s.source,
    title: s.title || null,
    content: s.content || null,
    account: s.account || null,
    speaker: s.speaker || null,
    arr: s.arr || 0,
    votes: s.votes || 0,
    category: s.category || null,
  })));

  return `You are a product signal classifier for a video editing SaaS company (similar to Descript). Your job is to assign customer signals to existing product themes and provide a brief summary of each signal.

## Existing Themes
${themeList}

## Signals to Classify
${signalList}

## Instructions
For each signal, determine:
1. Which existing theme(s) it belongs to (by theme ID). A signal can belong to multiple themes. Assign a relevance score (0.0-1.0) for each theme.
2. A brief summary (max 200 chars) capturing the customer's core need.
3. A confidence score (0.0-1.0) for how well the signal matches the assigned theme(s).
4. Brief reasoning for the classification.
5. If no existing theme fits well (confidence < 0.4), suggest a new theme name.

## Response Format
Return ONLY a JSON array (no markdown, no explanation):
[
  {
    "signalId": "...",
    "themeAssignments": [{"themeId": "...", "relevance": 0.85}],
    "summary": "Customer needs better transcription for medical terminology",
    "confidence": 0.92,
    "reasoning": "Direct mention of transcription accuracy for domain vocabulary",
    "suggestedNewTheme": null
  }
]`;
}

export function buildBiasDetectionPrompt(signals) {
  const signalList = JSON.stringify(signals.map(s => ({
    id: s.id,
    source: s.source,
    content: s.content || s.title || '',
    account: s.account || null,
    speaker: s.speaker || null,
    arr: s.arr || 0,
    votes: s.votes || 0,
  })));

  return `You are a signal bias detector for a product management tool. Your job is to identify potential biases in customer feedback signals.

## Bias Tags
- INTERNAL: Employee drove conversation toward roadmap item, inflating signal importance
- SOLUTION: Customer stated a specific solution rather than the underlying need
- WHALE: Large account whose volume or ARR distorts prioritization
- VOTE-STACK: Upvote-heavy but niche or coordinated request (artificially inflated votes)
- CLEAN: Genuine, well-articulated customer need with no detectable bias
- COMPETITIVE: Competitor mentioned; often missed by inbound analysis systems
- MISSING: Strategic opportunity invisible to inbound analysis (requires proactive discovery)

## Signals to Analyze
${signalList}

## Instructions
For each signal, determine:
1. The most appropriate bias tag from the list above.
2. A confidence score (0.0-1.0) for the bias classification.
3. Brief reasoning explaining why this bias tag was assigned.

Key heuristics:
- ARR > $80K and strong opinion → consider WHALE
- Internal speaker or employee-led framing → consider INTERNAL
- "We need X feature" (specific solution, not problem) → consider SOLUTION
- Very high votes but narrow use case → consider VOTE-STACK
- Mentions competitor by name → consider COMPETITIVE
- Clear problem statement from real user → likely CLEAN

## Response Format
Return ONLY a JSON array (no markdown, no explanation):
[
  {
    "signalId": "...",
    "biasTag": "CLEAN",
    "confidence": 0.85,
    "reasoning": "Clear customer need expressed as a problem, not a solution"
  }
]`;
}
