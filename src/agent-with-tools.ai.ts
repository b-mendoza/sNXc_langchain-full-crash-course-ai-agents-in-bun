import type { UserModelMessage } from "ai";
import { ToolLoopAgent, tool } from "ai";
import { openai } from "@ai-sdk/openai";
import * as z from "zod";

const SYSTEM_PROMPT =
  "You are a helpful weather assistant who always cracks jokes and is humorous while remaining helpful.";

const userIdSchema = z.enum(["user-123", "user-456", "user-789"]);

type UserId = z.infer<typeof userIdSchema>;

const agentContextSchema = z.object({
  userId: userIdSchema.describe("The unique identifier of the user"),
});

interface AgentContext extends z.infer<typeof agentContextSchema> {}

const getWeatherInputsSchema = z.object({
  city: z.string().describe("The city to get the weather for"),
});

const getWeatherOutputSchema = z.object({
  city: z.string().describe("The city the weather information is for"),
  description: z.string().describe("A brief description of the weather"),
  temperature: z.number().describe("The current temperature in Celsius"),
});

const getWeatherTool = tool({
  description: "Return weather information for a given city",
  inputSchema: getWeatherInputsSchema,
  outputSchema: getWeatherOutputSchema,
  execute: (inputs) => {
    return getWeatherOutputSchema.parse({
      city: inputs.city,
      description: "It's always sunny!",
      temperature: 25,
    });
  },
});

const LOCATIONS_BY_USER_ID: Record<UserId, string> = {
  "user-123": "New York",
  "user-456": "Los Angeles",
  "user-789": "Chicago",
};

const locateUserInputsSchema = z.object({
  // No inputs needed to locate the user since we will use the context
});

const locateUserOutputSchema = z.object({
  city: z.string().describe("The city the user is located in"),
});

const locateUserTool = tool({
  description: "Locate the user based on the context",
  execute: (_inputs, options) => {
    const { userId } = agentContextSchema.parse(options.experimental_context);

    return {
      city: LOCATIONS_BY_USER_ID[userId],
    };
  },
  inputSchema: locateUserInputsSchema,
  outputSchema: locateUserOutputSchema,
});

const DEFAULT_AGENT_CONTEXT: AgentContext = {
  userId: "user-789",
};

const agent = new ToolLoopAgent({
  experimental_context: DEFAULT_AGENT_CONTEXT,
  instructions: SYSTEM_PROMPT,
  model: openai("gpt-4.1-mini-2025-04-14"),
  tools: {
    getWeather: getWeatherTool,
    locateUser: locateUserTool,
  },
});

const userMessage: UserModelMessage = {
  role: "user",
  content: "What's the weather like today?",
};

const agentResponse = await agent.stream({
  messages: [userMessage],
});

for await (const chunk of agentResponse.textStream) {
  process.stdout.write(chunk);
}
