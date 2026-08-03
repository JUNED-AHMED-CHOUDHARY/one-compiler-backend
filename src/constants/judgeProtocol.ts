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
