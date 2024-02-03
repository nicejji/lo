import { isAlphaNumCh, isDigitCh, isSpaceChar } from "./helpers";
import type { Expression, Token } from "./types";

const OPS = ["+", "-", "*", "**", "/", "=", "<", ">", ","] as const;
const RESERVED = [
	...OPS,
	"null",
	"loop",
	"break",
	"with",
	"if",
	"then",
	"else",
	"@",
	"(",
	")",
	"'",
	"|",
] as const;

type Op = (typeof OPS)[number];
type Keyword = (typeof RESERVED)[number];

const isOp = (str: string): str is Op => OPS.includes(str as Op);
const isKeyword = (str: string): str is Keyword =>
	RESERVED.includes(str as Keyword);

const wrapInExpr = (tokens: Token[]): Expression => ({
	type: "EXPRESSION",
	tokens,
});

export default class Parser {
	src: string;
	#stack: Token[][] = [[]];
	#pos = 0;

	constructor(src: string) {
		this.src = src;
	}

	get #posAtEnd() {
		return this.#pos > this.src.length - 1;
	}

	#pushStack() {
		this.#stack.push([]);
	}

	#popStack() {
		const tokens = this.#stack.pop();
		if (!tokens || this.#stack.length < 1)
			throw "ParserError: Bracket not opened before closing";

		if (
			(this.#lastToken?.type === "LOOP" || this.#lastToken?.type === "FUNC") &&
			!this.#lastToken.body
		) {
			this.#lastToken.body = { type: "EXPRESSION", tokens };
			return;
		}

		if (this.#lastToken?.type === "BREAK" && !this.#lastToken.with) {
			this.#lastToken.with = { type: "EXPRESSION", tokens };
			return;
		}

		if (this.#lastToken?.type === "FUNC_CALL" && !this.#lastToken.param) {
			this.#lastToken.param = { type: "EXPRESSION", tokens };
			return;
		}

		if (this.#lastToken?.type === "CONDITION_TOKEN") {
			if (!this.#lastToken.condition) {
				this.#lastToken.condition = { type: "EXPRESSION", tokens };
				return;
			}
			if (!this.#lastToken.then) {
				this.#lastToken.then = { type: "EXPRESSION", tokens };
				return;
			}
			if (!this.#lastToken.else) {
				this.#lastToken.else = { type: "EXPRESSION", tokens };
				return;
			}
		}
		this.#pushToken({ type: "EXPRESSION", tokens });
	}

	get #lastToken() {
		return this.#stack.at(-1)?.at(-1);
	}

	#pushToken(token: Token) {
		this.#stack.at(-1)?.push(token);
	}

	get #currChar() {
		return this.src[this.#pos];
	}

	#popChar() {
		return this.src[this.#pos++];
	}

	#popWhile(cond: (ch: string, popped: string) => boolean) {
		let str = "";
		while (!this.#posAtEnd && cond(this.#currChar, str)) str += this.#popChar();
		return str;
	}

	#popSpaces() {
		return this.#popWhile(isSpaceChar);
	}

	#popReserved(): Keyword | null {
		this.#popSpaces();
		const str = this.#popWhile((ch, popped) =>
			RESERVED.some((kw) => kw.startsWith(popped + ch)),
		);
		if (!isKeyword(str)) {
			this.#pos -= str.length;
			return null;
		}
		return str;
	}

	#popIdent(): string | null {
		this.#popSpaces();
		const str = this.#popWhile((ch) => isAlphaNumCh(ch));
		if (!str) return null;
		return str;
	}

	#popNumericLiteral(): string | null {
		this.#popSpaces();
		let str = this.#popWhile((ch) => isDigitCh(ch));
		if (!str) return null;
		return str;
	}

	parse() {
		while (!this.#posAtEnd) {
			const kw = this.#popReserved();
			// Expression parsing
			if (kw === "(") {
				this.#pushStack();
				continue;
			}
			if (kw === ")") {
				this.#popStack();
				continue;
			}

			// If parsing
			if (kw === "if") {
				if (this.#popReserved() !== "(")
					throw `ParseError: Expected expression after if`;
				this.#pushToken({
					type: "CONDITION_TOKEN",
					then: wrapInExpr([]),
					else: wrapInExpr([]),
				});
				this.#pushStack();
				continue;
			}

			if (kw === "then") {
				if (this.#lastToken?.type !== "CONDITION_TOKEN")
					throw `ParserError: Expected if () before then`;
				if (this.#popReserved() !== "(")
					throw `ParseError: Expected expression after then`;
				this.#lastToken.then = undefined;
				this.#pushStack();
				continue;
			}

			if (kw === "else") {
				if (this.#lastToken?.type !== "CONDITION_TOKEN")
					throw `ParserError: Expected then () before else`;
				if (this.#popReserved() !== "(")
					throw `ParseError: Expected expression after else`;
				this.#lastToken.else = undefined;
				this.#pushStack();
				continue;
			}

			// Procedure call parsing
			// TODO: arguments parsing
			if (kw === "@") {
				const name = this.#popIdent();
				if (!name) throw `ParserError: Expected Ident after @`;
				if (this.#popReserved() !== "(")
					throw `ParseError: Expected expression after ident call`;
				this.#pushToken({ type: "FUNC_CALL", name });
				this.#pushStack();
				continue;
			}

			// Loop Token parser
			if (kw === "loop") {
				const name = this.#popIdent();
				if (!name) throw `ParserError: Expected Name after loop`;
				if (this.#popReserved() !== "(")
					throw `ParseError: Expected expression after loop name`;
				this.#pushToken({ type: "LOOP", name });
				this.#pushStack();
				continue;
			}

			if (kw === "break") {
				const name = this.#popIdent();
				if (!name) throw `ParserError: Expected Name after break`;
				this.#pushToken({ type: "BREAK", name, with: wrapInExpr([]) });
				continue;
			}

			if (kw === "with") {
				if (this.#lastToken?.type !== "BREAK")
					throw `Expected break before with`;
				if (this.#popReserved() !== "(") throw `Expected expression after with`;
				this.#lastToken.with = undefined;
				this.#pushStack();
				continue;
			}

			// Func Token parser
			if (kw === "|") {
				const param = this.#popIdent();
				if (this.#popReserved() !== "|")
					throw `ParserError: Expected | after fun parameter`;
				if (this.#popReserved() !== "(")
					throw `ParserError: Expected expression after |`;
				this.#pushToken({ type: "FUNC", param });
				this.#pushStack();
				continue;
			}

			// Null literal parsing
			if (kw === "null") {
				this.#pushToken({ type: "LITERAL", value: null });
				continue;
			}

			// Character literal parsing
			if (kw === "'") {
				const literal = this.#popWhile((ch) => ch !== "'");
				if (this.#popReserved() !== "'") throw `ParserError: Unclosed literal`;
				this.#pushToken({ type: "LITERAL", value: literal.charCodeAt(0) });
				continue;
			}

			// Operators parsing
			if (kw && isOp(kw)) {
				this.#pushToken({ type: "OP", code: kw });
				continue;
			}

			// Numeric literal parsing
			const numLiteral = this.#popNumericLiteral();
			if (numLiteral) {
				this.#pushToken({ type: "LITERAL", value: Number(numLiteral) });
				continue;
			}

			// Identifier parsing
			const name = this.#popIdent();
			if (name) {
				this.#pushToken({ type: "IDENT", name });
				continue;
			}
		}

		const tokens = this.#stack.at(0);
		if (!tokens || this.#stack.length !== 1)
			throw "ParserError: Bracket not closed";
		return tokens;
	}
}
