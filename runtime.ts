import type { FuncToken, OpToken, Token } from "./types";

type Memory = Map<string, Value>;

const MATH_OPS = ["+", "-", "*", "/", "**", "<", ">"] as const;
type MathOp = (typeof MATH_OPS)[number];

const EXEC_MAP: Record<MathOp, (left: number, right: number) => number> = {
	"+": (a, b) => a + b,
	"-": (a, b) => a - b,
	"*": (a, b) => a * b,
	"/": (a, b) => a / b,
	"**": (a, b) => a ** b,
	">": (a, b) => (a > b ? 1 : 0),
	"<": (a, b) => (a < b ? 1 : 0),
};

const isMathOp = (str: string): str is MathOp =>
	MATH_OPS.includes(str as MathOp);

type Value = number | null | FuncToken;

export default class Runtime {
	#stack: Memory[] = [new Map()];
	#loops: string[] = [];

	run(tokens: Token[]) {
		// console.dir(tokens, { depth: null });
		const value = this.#runToken({
			type: "EXPRESSION",
			tokens,
		});
		return value;
	}

	#resolveIdent(name: string): Value {
		let value: Value = null;
		let stackIndex = this.#stack.length - 1;
		while (true) {
			value = this.#stack[stackIndex].get(name) ?? null;
			if (value !== null) return value;
			if (stackIndex === 0) return value;
			stackIndex -= 1;
		}
	}

	#assign(name: string, value: Value) {
		let stackIndex = this.#stack.length - 1;
		while (true) {
			const definedInScope = this.#stack[stackIndex].get(name) ?? null;
			if (definedInScope || stackIndex === 0) {
				this.#stack[stackIndex].set(name, value);
				return;
			}
			stackIndex -= 1;
		}
	}

	#runToken(token: Token, stackMem: Memory | null = null): Value {
		switch (token.type) {
			case "EXPRESSION": {
				this.#stack.push(new Map([...(stackMem ?? [])]));
				const tokens = [...token.tokens];
				const chunks = tokens.reduce(
					(acc, curr) => {
						if (curr.type === "OP" && curr.code === ",") {
							acc.push([]);
							return acc;
						}
						acc.at(-1)?.push(curr);
						return acc;
					},
					[[]] as Token[][],
				);

				console.log("chunks");
				console.dir(chunks, { depth: null });
				console.log();
				for (const chunk of chunks) {
					while (true) {
						let opIndex = chunk.findLastIndex(
							(t) => t.type === "OP" && t.code === "**",
						);
						if (opIndex === -1)
							opIndex = chunk.findLastIndex(
								(t) => t.type === "OP" && ["*", "/"].includes(t.code),
							);
						if (opIndex === -1)
							opIndex = chunk.findLastIndex(
								(t) => t.type === "OP" && ["+", "-"].includes(t.code),
							);
						if (opIndex === -1)
							opIndex = chunk.findLastIndex(
								(t) => t.type === "OP" && ["<", ">"].includes(t.code),
							);
						if (opIndex === -1)
							opIndex = chunk.findLastIndex(
								(t) => t.type === "OP" && t.code === "=",
							);
						if (opIndex === -1) break;

						const left = chunk[opIndex - 1];
						if (!left) throw `RuntimeError: No left operand`;
						const right = chunk[opIndex + 1];
						if (!right) throw `RuntimeError: No right operand`;
						const opCode = (chunk[opIndex] as OpToken).code;

						if (isMathOp(opCode)) {
							const leftValue = this.#runToken(left);
							if (typeof leftValue !== "number")
								throw `RuntimeError: Left ${leftValue} can't be ${opCode}`;
							const rightValue = this.#runToken(right);
							if (typeof rightValue !== "number")
								throw `RuntimeError: Right ${rightValue} can be ${opCode}`;
							tokens.splice(opIndex - 1, 3, {
								type: "LITERAL",
								value: EXEC_MAP[opCode](leftValue, rightValue),
							});
						}
						if (opCode === "=") {
							if (left.type !== "IDENT")
								throw `RuntimeError: Assignment allowed only to Idents`;
							let value = this.#runToken(right);

							this.#assign(left.name, value);
							if (typeof value !== "number" && value !== null) value = null;
							chunk.splice(opIndex - 1, 3, { type: "LITERAL", value });
						}
					}
				}

				let value = null;
				while (true) {
					console.dir(tokens, { depth: 0 });
					if (!tokens) {
						this.#stack.pop();
						return value;
					}
					for (const token of tokens) {
						value = this.#runToken(token);
						if (token.type === "BREAK") break;
					}
				}
			}

			case "LITERAL": {
				return token.value;
			}
			case "IDENT": {
				return this.#resolveIdent(token.name);
			}
			case "FUNC_CALL": {
				if (token.name === "print") {
					console.log(token.param ? this.#runToken(token.param) : null);
					return null;
				}
				const func = this.#resolveIdent(token.name);
				if (!func || typeof func === "number")
					throw `RuntimeError: ${token.name} is not a func`;
				if (!func.body) return null;
				const paramValue =
					func.param && token.param ? this.#runToken(token.param) : null;
				// Special func
				const mem =
					paramValue && func.param ? new Map([[func.param, paramValue]]) : null;
				return this.#runToken(func.body, mem);
			}
			case "LOOP": {
				if (!token.body) return null;
				if (this.#loops.includes(token.name))
					throw `Loop with ${token.name} already running`;
				this.#loops.push(token.name);
				let value = null;
				while (this.#loops.at(-1) === token.name) {
					value = this.#runToken(token.body);
				}
				return value;
			}
			case "BREAK": {
				const index = this.#loops.findIndex(() => token.name);
				this.#loops = this.#loops.slice(0, index);
				return token.with ? this.#runToken(token.with) : null;
			}
			case "CONDITION_TOKEN": {
				if (!token.condition) return null;
				const condValue = this.#runToken(token.condition);
				if (condValue && token.then) return this.#runToken(token.then);
				if (!condValue && token.else) return this.#runToken(token.else);
				return null;
			}
			case "FUNC": {
				return token;
			}
			default: {
				throw `RuntimeError: Can't run ${token.type}`;
			}
		}
	}
}
