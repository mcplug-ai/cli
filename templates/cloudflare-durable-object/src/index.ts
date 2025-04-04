import { tool, createHandler, createDurableMcp } from '@mcplug/server/cloudflare';
import { env } from 'cloudflare:workers';
import { z } from 'zod';

export class MyDurableMcp extends createDurableMcp({
	name: 'MyDurableMcp',
}) {
	tools = {
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
	};
}

export default createHandler({
	secret: env.MCP_SECRET,
	versions: {
		'1.0.0': 'MyDurableMcp',
	},
});
