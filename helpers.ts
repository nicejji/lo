import { type OpToken } from "./runtime";

export const isOpCode = (char: string): char is OpToken["code"] => {
	return char === "+" || char === "-" || char === "*" || char === "/";
};
export const isDigitCh = (char: string) =>
	(char >= "0" && char <= "9") || char === ".";

export const isAlphaNumCh = (char: string) => {
	if (char === "_") return true;
	const code = char.charCodeAt(0);
	return (
		(code > 47 && code < 58) ||
		(code > 64 && code < 91) ||
		(code > 96 && code < 123)
	);
};

export const add = (left: number, right: number) => left + right;
export const sub = (left: number, right: number) => left - right;
export const mul = (left: number, right: number) => left * right;
export const div = (left: number, right: number) => left / right;
