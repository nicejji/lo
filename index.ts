import { parse } from "./parser";
import { run, type Expression } from "./runtime";

const CLEAR_PREV = "\x1b[1F\x1b[0K";
// Interactive
const memory = new Map<string, number>();
const proc_memory = new Map<string, Expression>();
for await (const line of console) {
	try {
		const [expression, _] = parse(line);
		const result = run(expression, memory, proc_memory);
		console.log(`${CLEAR_PREV}[ ${line} ] \x1b[32m=> ${result}\x1b[0m`);
		// console.log(`AST _____`);
		// console.dir(expression, { depth: null });
		// console.log(`AST _____`);
	} catch (error) {
		console.log(`${CLEAR_PREV}[ ${line} ] \x1b[31m=> ${error}\x1b[0m`);
	}
}
