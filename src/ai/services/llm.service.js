import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY must be configured to use AI features");
}

const configuredTemperature = process.env.GEMINI_TEMPERATURE;
const temperature =
  configuredTemperature === undefined ? 0.2 : Number(configuredTemperature);

if (!Number.isFinite(temperature) || temperature < 0 || temperature > 2) {
  throw new Error("GEMINI_TEMPERATURE must be a number between 0 and 2");
}

export const model = new ChatGoogleGenerativeAI({
  model: "gemini-3.5-flash",
  apiKey,
  temperature,
});
