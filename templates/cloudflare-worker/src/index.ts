import { tool, createWorkerMcp } from '@mcplug/server/cloudflare';
import { env } from 'cloudflare:workers';
import { z } from 'zod';

export default createWorkerMcp({
	secret: env.MCP_SECRET,
	versions: {
		'1.0.0': {
			tools: {
				'get-weather': tool('Use this tool to get the weather in a given city')
					.input(
						z.object({
							city: z.string(),
						})
					)
					.handle(async ({ input }) => {
						return {
							city: input.city,
							temp: 20,
							unit: 'C',
							condition: 'sunny',
						};
					}),
			},
		},
	},
});
