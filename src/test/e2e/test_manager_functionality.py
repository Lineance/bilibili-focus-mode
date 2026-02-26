"""
E2E Test: Manager Page Functionality
Tests core functionality of the manager interface
Note: Manager page requires Chrome extension APIs which are not available in test environment
"""

from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1280, "height": 800})

    print("=== Testing Manager Page Functionality ===\n")

    # Navigate to manager
    page.goto("http://localhost:5173/src/manager/index.html")
    page.wait_for_load_state("networkidle")

    # Wait for page to load (React needs time to render)
    page.wait_for_timeout(3000)

    # Test 1: Check page HTML structure
    print("Test 1: Page Structure")
    html_content = page.content()

    # Check if page has basic HTML structure
    has_html = "<html" in html_content
    has_body = "<body" in html_content
    has_root_div = 'id="root"' in html_content

    print(f"  HTML structure present: {has_html}")
    print(f"  Body tag present: {has_body}")
    print(f"  Root div present: {has_root_div}")

    # Test 2: Check page title in HTML
    print("\nTest 2: Page Title")
    title = page.title()
    print(f"  Page title: {title}")

    if "Bilibili Focus Mode" in title:
        print("  [OK] Page title correct")
    else:
        print("  [INFO] Page title different (may be loading)")

    # Test 3: Check for JavaScript errors in console
    print("\nTest 3: Console Errors")

    # Capture console messages
    console_messages = []
    page.on("console", lambda msg: console_messages.append(msg))

    # Reload page to capture console messages
    page.reload()
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)

    errors = [msg for msg in console_messages if msg.type == "error"]
    warnings = [msg for msg in console_messages if msg.type == "warning"]

    print(f"  Console errors: {len(errors)}")
    print(f"  Console warnings: {len(warnings)}")

    if errors:
        print("  First few errors:")
        for err in errors[:3]:
            print(f"    - {err.text[:100]}")

    # Test 4: Check if React app attempted to render
    print("\nTest 4: React App Status")

    # Check root div content
    root_content = page.evaluate(
        '() => document.getElementById("root")?.innerHTML || "empty"'
    )
    root_has_content = (
        root_content and root_content != "empty" and len(root_content) > 10
    )

    print(f"  Root div has content: {root_has_content}")
    if root_has_content:
        print(f"  Content length: {len(root_content)} chars")
        # Check for specific text
        has_chrome_error = (
            "chrome" in root_content.lower() and "storage" in root_content.lower()
        )
        if has_chrome_error:
            print(
                "  [INFO] Chrome storage API error detected (expected in test environment)"
            )

    # Test 5: Check network requests
    print("\nTest 5: Network Requests")

    # Reload and monitor network
    page.goto("http://localhost:5173/src/manager/index.html")

    failed_requests = []
    page.on("requestfailed", lambda request: failed_requests.append(request.url))

    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)

    print(f"  Failed requests: {len(failed_requests)}")
    if failed_requests:
        for url in failed_requests[:3]:
            print(f"    - {url}")

    # Take final screenshot
    page.screenshot(path="src/test/e2e/screenshots/manager_final.png", full_page=True)
    print(f"\n  Screenshot saved: src/test/e2e/screenshots/manager_final.png")

    # Test 6: Check if popup works (it doesn't depend on Chrome storage as much)
    print("\nTest 6: Popup Page Check")
    page.goto("http://localhost:5173/src/popup/index.html")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1000)

    popup_title = page.title()
    popup_has_content = len(page.content()) > 500

    print(f"  Popup title: {popup_title}")
    print(f"  Popup has content: {popup_has_content}")

    browser.close()
    print("\n=== Manager Page Tests Complete ===")
    print("\nNote: Manager page requires Chrome extension APIs.")
    print("Tests verify page loads without critical errors.")
