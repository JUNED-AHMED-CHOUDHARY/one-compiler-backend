/**
 * Example hidden_stub_code for the array-sum load test.
 * Replace {{USER_CODE}} with the author's reference / user solution.
 *
 * Contract:
 *   stdin  -> N, then for each case: input block + expected line
 *   stdout -> SUCCESS:ALL_PASSED  OR  FAIL:<test_case_number>:<actual>:<expected>
 */
#include <iostream>
#include <vector>

{{USER_CODE}}

int main() {
  std::ios_base::sync_with_stdio(false);
  std::cin.tie(nullptr);

  int totalTestCases;
  if (!(std::cin >> totalTestCases)) return 0;

  for (int caseIndex = 1; caseIndex <= totalTestCases; ++caseIndex) {
    int n;
    std::cin >> n;
    std::vector<long long> arr(n);
    for (int i = 0; i < n; ++i) std::cin >> arr[i];

    long long expected;
    std::cin >> expected;

    long long actual = solve(n, arr); // provided by {{USER_CODE}}

    if (actual != expected) {
      std::cout << "FAIL:" << caseIndex << ":" << actual << ":" << expected << "\n";
      return 0;
    }
  }

  std::cout << "SUCCESS:ALL_PASSED\n";
  return 0;
}
