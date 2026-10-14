import { createScanner, LanguageVariant, SyntaxKind } from "typescript/unstable/ast";

export interface TestBlock {
  title: string;
  body: string;
  timeout: number | null;
}

interface Token {
  kind: SyntaxKind;
  text: string;
  value: string;
  start: number;
  end: number;
}

/** Balance call arguments while ignoring comments, strings, regexps and template text. */
export function testBlocks(text: string): TestBlock[] {
  const scanner = createScanner(true, LanguageVariant.Standard, text);
  const tokens: Token[] = [];
  const pairs = new Map<number, number>();
  const stack: number[] = [];
  const endsExpression = new Set([
    SyntaxKind.Identifier, SyntaxKind.NumericLiteral, SyntaxKind.StringLiteral,
    SyntaxKind.NoSubstitutionTemplateLiteral, SyntaxKind.TemplateTail,
    SyntaxKind.CloseParenToken, SyntaxKind.CloseBracketToken, SyntaxKind.CloseBraceToken,
    SyntaxKind.TrueKeyword, SyntaxKind.FalseKeyword, SyntaxKind.NullKeyword,
  ]);
  for (let kind = scanner.scan(); kind !== SyntaxKind.EndOfFile; kind = scanner.scan()) {
    if (kind === SyntaxKind.SlashToken && !endsExpression.has(tokens.at(-1)?.kind ?? SyntaxKind.Unknown)) {
      kind = scanner.reScanSlashToken();
    }
    // A template interpolation closes with a brace, then resumes literal scanning.
    if (kind === SyntaxKind.CloseBraceToken && tokens[stack.at(-1) ?? -1]?.kind === SyntaxKind.TemplateHead) {
      kind = scanner.reScanTemplateToken(true);
    }
    const i = tokens.length;
    tokens.push({ kind, text: scanner.getTokenText(), value: scanner.getTokenValue(),
      start: scanner.getTokenStart(), end: scanner.getTokenEnd() });
    if ([SyntaxKind.OpenParenToken, SyntaxKind.OpenBracketToken, SyntaxKind.OpenBraceToken, SyntaxKind.TemplateHead].includes(kind)) {
      stack.push(i);
    } else if ([SyntaxKind.CloseParenToken, SyntaxKind.CloseBracketToken, SyntaxKind.CloseBraceToken, SyntaxKind.TemplateTail].includes(kind)) {
      const open = stack.pop();
      if (open !== undefined) pairs.set(open, i);
    }
  }

  const found: TestBlock[] = [];
  for (let i = 0; i < tokens.length; i += 1) {
    if (!["it", "test"].includes(tokens[i]!.text) || tokens[i - 1]?.text === ".") continue;
    let j = i + 1;
    while (tokens[j]?.text === "." && ["only", "skip", "concurrent", "sequential"].includes(tokens[j + 1]?.text ?? "")) j += 2;
    if (tokens[j]?.text === "." && tokens[j + 1]?.text === "each") {
      j += 2;
      if (tokens[j]?.text === "(" || tokens[j]?.kind === SyntaxKind.TemplateHead) j = (pairs.get(j) ?? tokens.length) + 1;
      else if (tokens[j]?.kind === SyntaxKind.NoSubstitutionTemplateLiteral) j += 1;
      else continue;
    }
    if (tokens[j]?.text !== "(" || tokens[j + 1]?.kind !== SyntaxKind.StringLiteral) continue;
    const end = pairs.get(j);
    if (end === undefined) continue;
    const args: Token[][] = [];
    let start = j + 1;
    for (let k = start; k < end; k += 1) {
      if (tokens[k]!.text === ",") {
        args.push(tokens.slice(start, k));
        start = k + 1;
      } else if (pairs.has(k)) k = pairs.get(k)!;
    }
    if (start < end) args.push(tokens.slice(start, end));
    if (args.length < 2) continue;
    const timeout = args[2];
    // The each table enumerates cases; only the callback determines per-case work.
    found.push({ title: tokens[j + 1]!.value, body: text.slice(tokens[j]!.start, tokens[end]!.end),
      timeout: timeout?.length === 1 && timeout[0]!.kind === SyntaxKind.NumericLiteral
        ? Number(timeout[0]!.text.replace(/_/g, "")) : null });
    i = end;
  }
  return found;
}
