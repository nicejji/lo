export type ConditionToken = {
	type: "CONDITION_TOKEN";
	condition: Expression;
	true: Expression;
	false: Expression;
};

export type RepeatToken = {
	type: "REPEAT_TOKEN";
	times: Expression;
	body: Expression;
};

export type ProcedureToken = {
	type: "PROCEDURE";
	name: string;
	body: Expression;
};

export type ProcedureCall = {
	name: string;
	type: "PROCEDURE_CALL";
};

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
	right:
		| Expression
		| LiteralToken
		| IdentToken
		| ProcedureToken
		| ProcedureCall
		| ConditionToken;
};

export type Expression = {
	type: "EXPRESSION";
	tokens: Token[];
};

export type Token =
	| ConditionToken
	| IdentToken
	| LiteralToken
	| OpToken
	| AssignmentToken
	| Expression
	| RepeatToken
	| ProcedureToken
	| ProcedureCall;

export const run = (
	token: Token,
	memory: Map<string, number>,
	proc_memory: Map<string, Expression>,
): number => {
	switch (token.type) {
		case "CONDITION_TOKEN": {
			const cond_value = run(token.condition, memory, proc_memory);
			if (cond_value >= 0) return run(token.true, memory, proc_memory);
			return run(token.false, memory, proc_memory);
		}
		case "REPEAT_TOKEN": {
			const times = run(token.times, memory, proc_memory);
			let result = NaN;
			for (let i = 0; i < times; i++) {
				result = run(token.body, memory, proc_memory);
			}
			return result;
		}
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
				const value = op.exec(
					run(left, memory, proc_memory),
					run(right, memory, proc_memory),
				);

				tokens.splice(opIndex - 1, 3, { type: "LITERAL", value });
			}

			let last = NaN;
			for (const token of tokens) {
				last = run(token, memory, proc_memory);
			}
			return last;
		}

		case "LITERAL":
			return token.value;

		case "IDENT": {
			return memory.get(token.value) ?? NaN;
		}

		case "ASSIGNMENT": {
			if (token.right.type === "PROCEDURE") {
				proc_memory.set(token.left.value, token.right.body);
				return NaN;
			}
			memory.set(token.left.value, run(token.right, memory, proc_memory));
			return memory.get(token.left.value) ?? NaN;
		}

		case "PROCEDURE": {
			return NaN;
		}

		case "PROCEDURE_CALL": {
			const exp = proc_memory.get(token.name);
			if (!exp) return NaN;
			return run(exp, memory, proc_memory);
		}

		case "OP":
			throw `RuntimeError: Can't calculate value of ${token.code}'`;
	}
};
