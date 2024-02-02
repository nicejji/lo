import { parse } from "./parser";
import { run } from "./runtime";

const CLEAR_PREV = "\x1b[1F\x1b[0K";
// Interactive
const memory = new Map<string, number>();
for await (const line of console) {
	try {
		const expression = parse(line);
		const result = run(expression, memory);
		console.log(`${CLEAR_PREV}[ ${line} ] \x1b[32m=> ${result}\x1b[0m`);
		// console.dir(expression, { depth: null });
	} catch (error) {
		console.log(`${CLEAR_PREV}[ ${line} ] \x1b[31m=> ${error}\x1b[0m`);
	}
}
