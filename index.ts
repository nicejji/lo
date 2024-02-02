import { parse } from "./parser";
import { run, type Expression } from "./runtime";

const memory = new Map<string, number>();
const proc_memory = new Map<string, Expression>();

const filePath = process.argv[2];
if (filePath) {
	const src = (await Bun.file(filePath).text()).trim();
	try {
		const [expression, _] = parse(src);
		// console.dir(expression, { depth: null });
		const result = run(expression, memory, proc_memory);
		console.log(`\x1b[32m=> ${result}\x1b[0m`);
	} catch (error) {
		console.log(`\x1b[31m=> ${error}\x1b[0m`);
	}
}

if (!filePath) {
	const CLEAR_PREV = "\x1b[1F\x1b[0K";
	// Interactive
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
}
