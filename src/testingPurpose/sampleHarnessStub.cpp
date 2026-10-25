/**
 * Example hidden_stub_code for the array-sum load test.
 * The single USER_CODE placeholder below is replaced with the reference / user solution
 * (assembleExecutableCode replaces only the first occurrence, so never mention it in comments).
 *
 * Judge mode (no args):
 *   stdin  -> N, then for each case: input block + expected line
 *   stdout -> SUCCESS:ALL_PASSED  OR  FAIL:<test_case_number>:<actual>:<expected>
 *
 * Run mode (--run), used by the learner Run button:
 *   stdin  -> N, then for each case: input block only
 *   stdout -> per case: @@CASE@@ <solution prints> @@RESULT@@<actual>
 */
#include <cstring>
#include <iostream>
#include <vector>

{{USER_CODE}}

int main(int argc, char* argv[]) {
  std::ios_base::sync_with_stdio(false);
  std::cin.tie(nullptr);

  const bool runMode = argc > 1 && std::strcmp(argv[1], "--run") == 0;

  int totalTestCases;
  if (!(std::cin >> totalTestCases)) return 0;

  for (int caseIndex = 1; caseIndex <= totalTestCases; ++caseIndex) {
    int n;
    std::cin >> n;
    std::vector<long long> arr(n);
    for (int i = 0; i < n; ++i) std::cin >> arr[i];

    if (runMode) {
      std::cout << "@@CASE@@" << std::endl;  // endl flushes: keeps prints attributable if solve() crashes
      long long actual = solve(n, arr);       // provided by the injected solution
      std::cout << "\n@@RESULT@@" << actual << std::endl;
      continue;
    }

    long long expected;
    std::cin >> expected;

    long long actual = solve(n, arr);

    // leading \n: the verdict must be its own line even if the solution printed without one
    if (actual != expected) {
      std::cout << "\nFAIL:" << caseIndex << ":" << actual << ":" << expected << "\n";
      return 0;
    }
  }

  if (!runMode) std::cout << "\nSUCCESS:ALL_PASSED\n";
  return 0;
}
