import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const source = fs.readFileSync(path.join(process.cwd(), "src/lib/diagnostic.ts"), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const module = { exports: {} };
new Function("exports", "module", compiled)(module.exports, module);
const { evaluateDiagnostic } = module.exports;

const fixtures = [
  { name: "controlled process", answers: ["yes", "yes", "yes", "yes", "no", "no", "no"], expected: "Controlled Foundation" },
  { name: "missing CRM control", answers: ["no", "no", "no", "no", "no", "no", "no"], expected: "Blind CRM" },
  { name: "insufficient visibility", answers: ["unknown", "unknown", "unknown", "unknown", "unknown", "unknown", "unknown"], expected: "Insufficient Visibility" },
  { name: "manual process", answers: ["yes", "yes", "yes", "yes", "yes", "yes", "yes"], expected: "Manual Operations" }
];

for (const fixture of fixtures) {
  const answers = Object.fromEntries(fixture.answers.map((answer, index) => [index, answer]));
  const actual = evaluateDiagnostic(answers)?.code;
  if (actual !== fixture.expected) throw new Error(`${fixture.name}: expected ${fixture.expected}, received ${actual}`);
}
if (evaluateDiagnostic({ 0: "yes" }) !== null) throw new Error("Incomplete diagnostic must not return a result");
console.log(JSON.stringify({ fixtures: fixtures.length + 1, status: "passed" }, null, 2));
