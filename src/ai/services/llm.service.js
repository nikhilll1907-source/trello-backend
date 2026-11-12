import { ChatOpenAI } from "@langchain/openai";

const apiKey = process.env.OPENROUTER_API_KEY;

if (!apiKey) {
  throw new Error("OPENROUTER_API_KEY must be configured to use AI features");
}

const configuredTemperature = process.env.LLM_TEMPERATURE;
const temperature =
  configuredTemperature === undefined ? 0.2 : Number(configuredTemperature);

if (!Number.isFinite(temperature) || temperature < 0 || temperature > 2) {
  throw new Error("LLM_TEMPERATURE must be a number between 0 and 2");
}

export const model = new ChatOpenAI({
  model: "openrouter/free",
  apiKey,
  temperature,
  configuration: {
    baseURL: "https://openrouter.ai/api/v1",
  },
});
