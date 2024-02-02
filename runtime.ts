export type IdentToken = {
	type: "IDENT";
	value: string;
};

export type LiteralToken = {
	type: "LITERAL";
	value: number;
};

export type OpToken = {
	type: "OP";
	code: "+" | "-" | "*" | "/";
	exec: (left: number, right: number) => number;
};

export type AssignmentToken = {
	type: "ASSIGNMENT";
	left: IdentToken;
	right: Expression | LiteralToken | IdentToken;
};

export type Expression = {
	type: "EXPRESSION";
	tokens: Token[];
};

export type Token =
	| IdentToken
	| LiteralToken
	| OpToken
	| AssignmentToken
	| Expression;

export const run = (token: Token, memory: Map<string, number>): number => {
	switch (token.type) {
		case "EXPRESSION": {
			const tokens = [...token.tokens];

			while (true) {
				let opIndex = tokens.findIndex(
					(t) => t.type === "OP" && (t.code === "*" || t.code === "/"),
				);
				if (opIndex === -1)
					opIndex = tokens.findIndex(
						(t) => t.type === "OP" && (t.code === "+" || t.code === "-"),
					);
				if (opIndex === -1) break;

				const op = tokens[opIndex] as OpToken;
				const left = tokens.at(opIndex - 1);
				const right = tokens.at(opIndex + 1);
				if (!left || left.type === "OP") {
					throw `RuntimeError: Expected IDENT | LITERAL | EXPRESSION before '${op.code}'`;
				}
				if (!right || right.type === "OP") {
					throw `RuntimeError: Expected IDENT | LITERAL | EXPRESSION after '${op.code}'`;
				}
				const value = op.exec(run(left, memory), run(right, memory));

				tokens.splice(opIndex - 1, 3, { type: "LITERAL", value });
			}

			return run(tokens.at(-1) ?? { type: "LITERAL", value: NaN }, memory);
		}

		case "LITERAL":
			return token.value;

		case "IDENT": {
			return memory.get(token.value) ?? NaN;
		}

		case "ASSIGNMENT": {
			memory.set(token.left.value, run(token.right, memory));
			return memory.get(token.left.value) ?? NaN;
		}

		case "OP":
			throw `RuntimeError: Can't calculate value of ${token.code}'`;
	}
};
