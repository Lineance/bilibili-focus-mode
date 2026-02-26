"""
E2E Test Suite Runner for Bilibili Focus Mode
Runs all end-to-end tests using Playwright
"""

import subprocess
import sys
import os
from pathlib import Path

# Ensure screenshots directory exists
Path("src/test/e2e/screenshots").mkdir(parents=True, exist_ok=True)

test_files = [
    "src/test/e2e/test_element_discovery.py",
    "src/test/e2e/test_manager_functionality.py",
    "src/test/e2e/test_popup_functionality.py",
    "src/test/e2e/test_responsive_layout.py",
]

print("=" * 60)
print("Bilibili Focus Mode - E2E Test Suite")
print("=" * 60)
print()

# Check if playwright is installed
try:
    import playwright

    print("[OK] Playwright is installed")
except ImportError:
    print("[FAIL] Playwright not found. Installing...")
    subprocess.run([sys.executable, "-m", "pip", "install", "playwright"], check=True)
    subprocess.run(
        [sys.executable, "-m", "playwright", "install", "chromium"], check=True
    )
    print("[OK] Playwright installed")

print()

# Run each test
results = []
for test_file in test_files:
    print(f"\n{'=' * 60}")
    print(f"Running: {test_file}")
    print("=" * 60)

    try:
        result = subprocess.run(
            [sys.executable, test_file], capture_output=False, text=True, timeout=120
        )
        results.append((test_file, result.returncode == 0))
    except subprocess.TimeoutExpired:
        print(f"[FAIL] {test_file} - TIMEOUT")
        results.append((test_file, False))
    except Exception as e:
        print(f"[FAIL] {test_file} - ERROR: {e}")
        results.append((test_file, False))

# Print summary
print("\n" + "=" * 60)
print("TEST SUMMARY")
print("=" * 60)

passed = sum(1 for _, success in results if success)
total = len(results)

for test_file, success in results:
    status = "[PASS]" if success else "[FAIL]"
    print(f"{status}: {test_file}")

print()
print(f"Results: {passed}/{total} tests passed")

if passed == total:
    print("\n[SUCCESS] All tests passed!")
    sys.exit(0)
else:
    print(f"\n[WARNING] {total - passed} test(s) failed")
    sys.exit(1)
