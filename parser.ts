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
	ConditionToken,
	Expression,
	IdentToken,
	LiteralToken,
	OpToken,
	ProcedureCall,
	ProcedureToken,
	RepeatToken,
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

export const parse = (src: string): [Expression, number] => {
	let tokens: Token[] = [];
	let index = 0;

	const parseKeyword = <W extends string>(word: W) => {
		skipSpaces();
		for (let i = 0; i < word.length; i++) {
			if (word[i] !== src[index + i]) return null;
		}
		index += word.length;
		return word;
	};

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
		const start = parseKeyword("(");
		if (!start) return null;
		let [exp, offset] = parse(src.slice(index));
		index += offset;
		return exp;
	};

	const parseExpClose = (): Expression | null => {
		const start = parseKeyword(")");
		if (!start) return null;

		return wrapInExpression(tokens);
	};

	const parseAssignment = (): AssignmentToken | null => {
		if (src[index] !== "=") return null;
		index += 1;
		const left = tokens.pop();
		if (left?.type !== "IDENT") throw "ParseError: Expected IDENT before '='";
		const right = parseNext();

		if (!right)
			throw "ParseError: Expected IDENT | LITERAL | EXPRESSION | PROC | PROC_CALL after '='";
		if (
			right.type !== "IDENT" &&
			right.type !== "LITERAL" &&
			right.type !== "EXPRESSION" &&
			right.type !== "PROCEDURE" &&
			right.type !== "PROCEDURE_CALL" &&
			right.type !== "CONDITION_TOKEN"
		)
			throw "ParseError: Expected IDENT | LITERAL | EXPRESSION | PROC | PROC_CALL | COND after '='";
		return { type: "ASSIGNMENT", left, right };
	};

	const parseRepeat = (): RepeatToken | null => {
		const start = parseKeyword("repeat");
		if (!start) return null;
		const times = parseNext();
		if (!times) throw "ParseError: Expected EXPRESSION after 'repeat'";
		if (times.type !== "EXPRESSION")
			throw "ParseError: Expected EXPRESSION after 'repeat'";
		const body = parseNext();
		if (!body) throw "ParseError: Expected EXPRESSION inside 'repeat' body";
		if (body.type !== "EXPRESSION")
			throw "ParseError: Expected EXPRESSION inside 'repeat' body";
		return { type: "REPEAT_TOKEN", body, times };
	};

	const parseCondition = (): ConditionToken | null => {
		const start = parseKeyword("if");
		if (!start) return null;
		const condition = parseNext();
		if (!condition) throw "ParseError: Expected EXPRESSION after 'if'";
		if (condition.type !== "EXPRESSION")
			throw "ParseError: Expected EXPRESSION after 'if'";
		const trueBlock = parseNext();
		if (!trueBlock)
			throw "ParseError: Expected EXPRESSION after 'if' condition";
		if (trueBlock.type !== "EXPRESSION")
			throw "ParseError: Expected EXPRESSION after 'if' condition";
		const falseBlock = parseNext();
		if (!falseBlock)
			throw "ParseError: Expected EXPRESSION after 'if' true block";
		if (falseBlock.type !== "EXPRESSION")
			throw "ParseError: Expected EXPRESSION after 'if' true block";
		return {
			type: "CONDITION_TOKEN",
			condition,
			true: trueBlock,
			false: falseBlock,
		};
	};

	const parseProc = (): ProcedureToken | null => {
		const start = parseKeyword("proc");
		if (!start) return null;
		const body = parseNext();
		if (!body) throw "ParseError: Expected EXPRESSION after 'proc <name>'";
		if (body.type !== "EXPRESSION")
			throw "ParseError: Expected EXPRESSION after 'proc <name>'";
		return { type: "PROCEDURE", body, name: "" };
	};

	const parseProcCall = (): ProcedureCall | null => {
		const start = parseKeyword("@");
		if (!start) return null;
		const name = parseNext();
		if (!name) throw "ParseError: Expected IDENT after 'proc'";
		if (name.type !== "IDENT") throw "ParseError: Expected IDENT after 'proc'";
		return { type: "PROCEDURE_CALL", name: name.value };
	};

	const parseNext = (): Token | null => {
		return (
			parseCondition() ??
			parseRepeat() ??
			parseProc() ??
			parseProcCall() ??
			parseAssignment() ??
			parseOp() ??
			parseLiteral() ??
			parseIdent() ??
			parseExpression()
		);
	};

	while (index < src.length) {
		skipSpaces();

		const parsed = parseExpClose();
		if (parsed) return [parsed, index];

		const nextToken = parseNext();
		if (!nextToken) break;

		tokens.push(nextToken);
	}

	return [wrapInExpression(tokens), index];
};
