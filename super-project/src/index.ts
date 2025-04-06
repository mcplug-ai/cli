import { z } from "zod";
import { serve } from "@hono/node-server";
import { tool, createHonoMcp } from "@mcplug/server/hono";

const app = createHonoMcp({
  secret: process.env.MCP_SECRET!,
  versions: {
    "1.0.0": {
      name: "Weather_Mcp",
      tools: {
        "get-weather": tool("Use this tool to get the weather in a given city")
          .input(
            z.object({
              city: z.string()
            })
          )
          .handle(async ({ input }) => {
            return {
              city: input.city,
              temp: 20,
              unit: "C",
              condition: "sunny"
            };
          })
      }
    }
  }
});

serve(
  {
    fetch: app.fetch,
    port: 3000
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  }
);
