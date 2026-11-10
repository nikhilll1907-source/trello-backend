import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

export const createLlm = () => {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY must be configured to use AI features");
  }

  return new ChatGoogleGenerativeAI({
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    temperature: 0,
    apiKey,
  });
};
