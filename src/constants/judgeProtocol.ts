/**
 * In-process harness protocol (hidden stubs must speak this).
 *
 * Stdin layout:
 *   <N>
 *   <testcase 1 input>
 *   <testcase 1 expected>
 *   ...
 *   <testcase N input>
 *   <testcase N expected>
 *
 * The stub parses each case, calls the solution in-process, compares expected,
 * and prints exactly one verdict line:
 *   SUCCESS:ALL_PASSED
 *   FAIL:<test_case_number>:<actual>:<expected>
 */
export const HARNESS_SUCCESS = "SUCCESS:ALL_PASSED";
export const HARNESS_FAIL_PREFIX = "FAIL:";

export type HarnessVerdict =
  | { status: "passed" }
  | { status: "failed"; testCaseNumber: number; actual: string; expected: string; raw: string }
  | { status: "invalid"; raw: string };

const splitFailPayload = (payload: string): { testCaseNumberRaw: string; actual: string; expected: string } | null => {
  const first = payload.indexOf(":");
  if (first < 0) return null;

  const second = payload.indexOf(":", first + 1);
  if (second < 0) {
    return {
      testCaseNumberRaw: payload.slice(0, first),
      actual: payload.slice(first + 1),
      expected: ""
    };
  }

  return {
    testCaseNumberRaw: payload.slice(0, first),
    actual: payload.slice(first + 1, second),
    expected: payload.slice(second + 1)
  };
};

export const parseHarnessVerdict = (stdout: string): HarnessVerdict => {
  const lines = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const verdictLine = lines[lines.length - 1] ?? "";

  if (verdictLine === HARNESS_SUCCESS) {
    return { status: "passed" };
  }

  if (verdictLine.startsWith(HARNESS_FAIL_PREFIX)) {
    const parsed = splitFailPayload(verdictLine.slice(HARNESS_FAIL_PREFIX.length));
    if (!parsed) return { status: "invalid", raw: verdictLine };

    const testCaseNumber = Number(parsed.testCaseNumberRaw);
    if (!Number.isFinite(testCaseNumber)) {
      return { status: "invalid", raw: verdictLine };
    }

    return {
      status: "failed",
      testCaseNumber,
      actual: parsed.actual,
      expected: parsed.expected,
      raw: verdictLine
    };
  }

  return { status: "invalid", raw: verdictLine || stdout.trim() };
};

/**
 * Run mode (`<batchRunCommand> --run`) — powers the learner "Run" button (samples + custom testcases).
 *
 * Stdin layout:
 *   <N>
 *   <testcase 1 input>
 *   ...
 *   <testcase N input>          (no expected lines — the judge compares outside the stub)
 *
 * For each case the stub prints, flushing stdout after each marker:
 *   @@CASE@@                    before calling the solution
 *   ...whatever the solution prints...
 *   @@RESULT@@<serialized return value>
 */
export const RUN_MODE_FLAG = "--run";
const RUN_MODE_MARKER = /@@(CASE|RESULT)@@/g;

/** `output` is null when the case started but never produced a result (crash / TLE). */
export type RunModeCase = { stdout: string; output: string | null };

export const buildRunModeStdin = (inputs: string[]): string => `${inputs.length}\n${inputs.map((input) => `${input.replace(/\s+$/u, "")}\n`).join("")}`;

export const parseRunModeOutput = (stdout: string): RunModeCase[] => {
  const cases: RunModeCase[] = [];
  let caseStart: number | null = null;

  for (const match of stdout.matchAll(RUN_MODE_MARKER)) {
    const [marker, kind] = match;

    if (kind === "CASE") {
      if (caseStart !== null) cases.push({ stdout: stdout.slice(caseStart, match.index).trim(), output: null });
      caseStart = match.index + marker.length;
      continue;
    }

    if (caseStart === null) continue;

    const valueEnd = stdout.indexOf("\n", match.index);
    cases.push({
      stdout: stdout.slice(caseStart, match.index).trim(),
      output: stdout.slice(match.index + marker.length, valueEnd < 0 ? undefined : valueEnd).trim()
    });
    caseStart = null;
  }

  if (caseStart !== null) cases.push({ stdout: stdout.slice(caseStart).trim(), output: null });

  return cases;
};

/** Whitespace-insensitive equality — same leniency as the harness/diff -w judge paths. */
const collapseWhitespace = (value: string) => value.trim().split(/\s+/u).join(" ");

export const isSameOutput = (actual: string | null | undefined, expected: string | null | undefined): boolean =>
  actual != null && expected != null && collapseWhitespace(actual) === collapseWhitespace(expected);

export const testcaseInputKey = collapseWhitespace;
