import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

export function getAnthropicClient(apiKey?: string) {
  return new Anthropic({ apiKey: apiKey || process.env.ANTHROPIC_API_KEY });
}

export function getOpenAIClient(apiKey?: string) {
  return new OpenAI({ apiKey: apiKey || process.env.OPENAI_API_KEY });
}

export async function generateReviewReply(opts: {
  reviewText: string;
  rating: number;
  businessName: string;
  tone?: string;
  apiKey?: string;
}): Promise<string> {
  const { reviewText, rating, businessName, tone = "professional", apiKey } = opts;

  const client = getAnthropicClient(apiKey);

  const prompt = `You are a ${tone} customer service manager for ${businessName}.
Write a ${tone} reply to this ${rating}-star Google review.

Review: "${reviewText}"

Rules:
- Address the reviewer by name if mentioned
- Acknowledge specific points they raised
- Be genuine, not templated
- For negative reviews (1-3 stars): apologize sincerely and offer resolution
- For positive reviews (4-5 stars): thank them and reinforce the positive
- Keep it under 150 words
- Do NOT use generic phrases like "Thank you for your feedback"
- Sign off with the business name

Write only the reply, nothing else.`;

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    messages: [{ role: "user", content: prompt }],
  });

  return (message.content[0] as Anthropic.TextBlock).text;
}

export async function analyzeReview(reviewText: string, apiKey?: string): Promise<{
  sentiment: string;
  sentimentScore: number;
  keywords: string[];
  topics: string[];
  staffMentions: string[];
  serviceMentions: string[];
  positiveSignals: string[];
  negativeSignals: string[];
  categories: string[];
}> {
  const client = getAnthropicClient(apiKey);

  const prompt = `Analyze this customer review and return a JSON object with:
- sentiment: "VERY_POSITIVE" | "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "VERY_NEGATIVE"
- sentimentScore: float from -1.0 to 1.0
- keywords: array of key terms (max 10)
- topics: array of topics discussed (max 5)
- staffMentions: array of staff names or roles mentioned
- serviceMentions: array of services mentioned
- positiveSignals: array of positive aspects mentioned
- negativeSignals: array of negative aspects mentioned
- categories: array from ["Trust","Quality","Price","Speed","Customer Service","Results","Experience","Staff","Product","Location"]

Review: "${reviewText}"

Return ONLY valid JSON, no other text.`;

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 500,
    messages: [{ role: "user", content: prompt }],
  });

  const text = (message.content[0] as Anthropic.TextBlock).text;
  return JSON.parse(text);
}

export async function generateSocialProof(opts: {
  reviewText: string;
  reviewerName: string;
  rating: number;
  businessName: string;
  assetType: string;
  apiKey?: string;
}): Promise<string> {
  const { reviewText, reviewerName, rating, businessName, assetType, apiKey } = opts;
  const client = getAnthropicClient(apiKey);

  const prompts: Record<string, string> = {
    INSTAGRAM_POST: `Create an Instagram caption using this ${rating}-star review from ${reviewerName} about ${businessName}. Make it engaging, include emojis, and add relevant hashtags. Review: "${reviewText}"`,
    FACEBOOK_POST: `Create a Facebook post showcasing this ${rating}-star review from ${reviewerName} about ${businessName}. Make it conversational and shareable. Review: "${reviewText}"`,
    TESTIMONIAL: `Create a polished testimonial quote card text from this review by ${reviewerName} about ${businessName}. Extract the most impactful sentence and format it as a testimonial. Review: "${reviewText}"`,
    AD_COPY: `Create Facebook ad copy using this ${rating}-star review as social proof for ${businessName}. Include a headline, primary text, and CTA. Review: "${reviewText}"`,
    REEL_SCRIPT: `Create a 30-second Instagram Reel script showcasing this review for ${businessName}. Include hook, main content, and CTA. Review from ${reviewerName}: "${reviewText}"`,
  };

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 400,
    messages: [{ role: "user", content: prompts[assetType] || prompts.TESTIMONIAL }],
  });

  return (message.content[0] as Anthropic.TextBlock).text;
}

export async function generateAiRecommendations(opts: {
  businessName: string;
  avgRating: number;
  totalReviews: number;
  pendingReplies: number;
  lastMonthReviews: number;
  negativeReviews: number;
  apiKey?: string;
}): Promise<Array<{
  title: string;
  description: string;
  category: string;
  priority: string;
  impactScore: number;
  estimatedResult: string;
}>> {
  const { businessName, avgRating, totalReviews, pendingReplies, lastMonthReviews, negativeReviews } = opts;
  const apiKey = opts.apiKey;
  const client = getAnthropicClient(apiKey);

  const prompt = `You are a reputation management expert for ${businessName}.
Business stats:
- Average rating: ${avgRating}/5
- Total reviews: ${totalReviews}
- Pending replies: ${pendingReplies}
- Reviews last month: ${lastMonthReviews}
- Negative reviews: ${negativeReviews}

Generate 5 actionable recommendations as a JSON array. Each item:
{
  "title": "Short action title",
  "description": "Detailed description of what to do",
  "category": "review_response|profile_optimization|campaign|content|competitive",
  "priority": "high|medium|low",
  "impactScore": 0.0-10.0,
  "estimatedResult": "Expected outcome"
}

Return ONLY the JSON array.`;

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 800,
    messages: [{ role: "user", content: prompt }],
  });

  return JSON.parse((message.content[0] as Anthropic.TextBlock).text);
}

export async function generateAdCopy(opts: {
  reviewText: string;
  reviewerName: string;
  businessName: string;
  platform: "facebook" | "google";
  apiKey?: string;
}): Promise<{
  headlines: string[];
  descriptions: string[];
  primaryText?: string;
  cta?: string;
}> {
  const { reviewText, reviewerName, businessName, platform, apiKey } = opts;
  const client = getAnthropicClient(apiKey);

  const prompt = platform === "facebook"
    ? `Create Facebook ad copy from this review for ${businessName}.
Review by ${reviewerName}: "${reviewText}"
Return JSON with: headlines (array of 3, max 40 chars each), primaryText (max 125 chars), descriptions (array of 2, max 30 chars), cta (one of: LEARN_MORE, CONTACT_US, GET_QUOTE, BOOK_NOW, SIGN_UP)`
    : `Create Google RSA ad copy from this review for ${businessName}.
Review by ${reviewerName}: "${reviewText}"
Return JSON with: headlines (array of 5, max 30 chars each), descriptions (array of 4, max 90 chars each)`;

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 400,
    messages: [{ role: "user", content: prompt }],
  });

  return JSON.parse((message.content[0] as Anthropic.TextBlock).text);
}
