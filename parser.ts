import {
	add,
	div,
	isAlphaNumCh,
	mul,
	sub,
	isDigitCh,
	isOpCode,
} from "./helpers";
import type {
	AssignmentToken,
	Expression,
	IdentToken,
	LiteralToken,
	OpToken,
	Token,
} from "./runtime";

type CharTest = (char: string) => boolean;

const OP_MAP = {
	"+": add,
	"-": sub,
	"*": mul,
	"/": div,
} as const;

const wrapInExpression = (tokens: Token[]): Expression => {
	return { type: "EXPRESSION", tokens };
};

export const parse = (src: string): Expression => {
	let tokens: Token[] = [];
	let index = 0;

	const parseWhile = (test: CharTest) => {
		let parsed = "";
		while (index < src.length) {
			if (!test(src[index])) break;
			parsed += src[index];
			index += 1;
		}
		return parsed.length === 0 ? null : parsed;
	};

	const skipSpaces = () => parseWhile((ch) => ch === " " || ch === "\n");

	const parseOp = (): OpToken | null => {
		const parsed = parseWhile(isOpCode) as OpToken["code"] | null;
		if (parsed === null) return null;
		if (parsed?.length !== 1) throw `ParserError: Unknown operator '${parsed}'`;
		return { type: "OP", code: parsed, exec: OP_MAP[parsed] };
	};

	const parseIdent = (): IdentToken | null => {
		const parsed = parseWhile(isAlphaNumCh);
		if (parsed === null) return null;
		return { type: "IDENT", value: parsed };
	};

	const parseLiteral = (): LiteralToken | null => {
		const parsed = parseWhile(isDigitCh);
		if (parsed === null) return null;
		return { type: "LITERAL", value: Number(parsed) };
	};

	const parseExpression = (): Expression | null => {
		const parsed = parseWhile((ch) => ch === "(");
		if (parsed === null) return null;
		const expSrc = parseWhile((ch) => ch !== ")");
		if (!expSrc) return { type: "EXPRESSION", tokens: [] };
		index += 1;
		return parse(expSrc);
	};

	const parseAssignment = (): AssignmentToken | null => {
		if (src[index] !== "=") return null;
		index += 1;
		const left = tokens.pop();
		if (left?.type !== "IDENT") throw "ParseError: Expected IDENT before '='";
		const right = parseNext();

		if (!right)
			throw "ParseError: Expected IDENT | LITERAL | EXPRESSION after '='";
		if (
			right.type !== "IDENT" &&
			right.type !== "LITERAL" &&
			right.type !== "EXPRESSION"
		)
			throw "ParseError: Expected IDENT | LITERAL | EXPRESSION after '='";
		return { type: "ASSIGNMENT", left, right };
	};

	const parseNext = (): Token | null => {
		skipSpaces();
		return (
			parseOp() ??
			parseAssignment() ??
			parseLiteral() ??
			parseIdent() ??
			parseExpression()
		);
	};

	while (index < src.length) {
		const nextToken = parseNext();

		if (!nextToken) break;
		tokens.push(nextToken);
	}

	return wrapInExpression(tokens);
};
