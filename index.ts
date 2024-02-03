import Runtime from "./runtime";
import Parser from "./parser";

const filePath = process.argv[2];
if (filePath) {
	let src = (await Bun.file(filePath).text()).trim();
	const runtime = new Runtime();
	const parser = new Parser(src);
	try {
		const ast = parser.parse();
		// console.dir(ast, { depth: null });
		const result = runtime.run(ast);
		// console.log(`\x1b[32m=> ${JSON.stringify(result)}\x1b[0m`);
	} catch (error) {
		// console.log(`\x1b[31m=> ${error}\x1b[0m`);
	}
}

if (!filePath) {
	const CLEAR_PREV = ""; // "\x1b[1F\x1b[0K";
	// Interactive
	const runtime = new Runtime();
	for await (const line of console) {
		try {
			const parser = new Parser(line);
			const result = runtime.run(parser.parse());
			console.log(`${CLEAR_PREV}[ ${line} ] \x1b[32m=> ${result}\x1b[0m`);
		} catch (error) {
			console.log(`${CLEAR_PREV}[ ${line} ] \x1b[31m=> ${error}\x1b[0m`);
		}
	}
}

// console.log(`AST _____`);
// console.dir(expression, { depth: null });
// console.log(`AST _____`);
