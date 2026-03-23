import type { ToolRuntime } from "langchain";
import { createAgent, tool, HumanMessage } from "langchain";
import * as z from "zod";
import { ChatOpenAI } from "@langchain/openai";

const SYSTEM_PROMPT =
  "You are a helpful weather assistant who always cracks jokes and is humorous while remaining helpful.";

const userIdSchema = z.enum(["user-123", "user-456", "user-789"]);

type UserId = z.infer<typeof userIdSchema>;

const agentContextSchema = z.object({
  userId: userIdSchema.describe("The unique identifier of the user"),
});

const agentResponseSchema = z.object({
  humidity: z.number().describe("The current humidity percentage"),
  summary: z.string().describe("A brief summary of the weather"),
  temperatureInCelsius: z
    .number()
    .describe("The current temperature in Celsius"),
  temperatureInFahrenheit: z
    .number()
    .describe("The current temperature in Fahrenheit"),
});

const getWeatherInputsSchema = z.object({
  city: z.string().describe("The city to get the weather for"),
});

const getWeatherOutputSchema = z.object({
  city: z.string().describe("The city the weather information is for"),
  description: z.string().describe("A brief description of the weather"),
  temperature: z.number().describe("The current temperature in Celsius"),
});

const getWeatherTool = tool(
  (inputs) => {
    return getWeatherOutputSchema.parse({
      city: inputs.city,
      description: "It's always sunny!",
      temperature: 25,
    });
  },
  {
    description: "Return weather information for a given city",
    name: "getWeather",
    returnDirect: false,
    schema: getWeatherInputsSchema,
  },
);

const LOCATIONS_BY_USER_ID: Record<UserId, string> = {
  "user-123": "New York",
  "user-456": "Los Angeles",
  "user-789": "Chicago",
};

const locateUserTool = tool(
  (_inputs, runtime: ToolRuntime<undefined, typeof agentContextSchema>) => {
    const { userId } = runtime.context;

    return LOCATIONS_BY_USER_ID[userId];
  },
  {
    name: "locateUser",
    description: "Locate the user based on the context",
  },
);

const model = new ChatOpenAI({
  model: "gpt-4.1-mini-2025-04-14",
  temperature: 0.3,
});

const agent = createAgent({
  contextSchema: agentContextSchema,
  model,
  responseFormat: agentResponseSchema,
  systemPrompt: SYSTEM_PROMPT,
  tools: [getWeatherTool, locateUserTool],
});

const userMessage = new HumanMessage({
  content: "What's the weather like today?",
});

const agentResponse = await agent.invoke(
  {
    messages: [userMessage],
  },
  {
    context: {
      userId: "user-123",
    },
  },
);

console.log({
  agentResponse,
});
