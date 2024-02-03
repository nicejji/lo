export type ConditionToken = {
	type: "CONDITION_TOKEN";
	condition?: Expression;
	then?: Expression;
	else?: Expression;
};

export type FuncCall = {
	name: string;
	type: "FUNC_CALL";
	param?: Expression;
};

export type IdentToken = {
	type: "IDENT";
	name: string;
};

export type LiteralToken = {
	type: "LITERAL";
	value: number | null;
};

export type OpToken = {
	type: "OP";
	code: "+" | "-" | "*" | "/" | "=" | ">" | "<" | "**" | ",";
};

export type LoopToken = {
	type: "LOOP";
	name: string;
	body?: Expression;
};

export type BreakToken = {
	type: "BREAK";
	name: string;
	with?: Expression;
};

export type FuncToken = {
	type: "FUNC";
	param: string | null;
	body?: Expression;
};

export type Expression = {
	type: "EXPRESSION";
	tokens: Token[];
};

export type Token =
	| Expression
	| BreakToken
	| FuncToken
	| LoopToken
	| ConditionToken
	| IdentToken
	| LiteralToken
	| OpToken
	| FuncCall;
