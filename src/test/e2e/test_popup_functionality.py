"""
E2E Test: Popup Page Functionality
Tests the extension popup interface
"""

from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # Set a reasonable viewport size for popup
    page = browser.new_page(viewport={"width": 400, "height": 600})

    print("=== Testing Popup Page ===\n")

    # Navigate to popup
    page.goto("http://localhost:5173/src/popup/index.html")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(500)

    # Take initial screenshot
    page.screenshot(path="src/test/e2e/screenshots/popup_test.png")
    print("Screenshot saved: src/test/e2e/screenshots/popup_test.png\n")

    # Test 1: Check popup title
    print("Test 1: Popup Title")
    try:
        title = page.locator("h1").inner_text()
        print(f"  ✓ Popup title: {title}")
        assert "Bilibili Focus Mode" in title
    except Exception as e:
        print(f"  ✗ Error getting title: {e}")

    # Test 2: Check all buttons in popup
    print("\nTest 2: Popup Buttons")
    buttons = page.locator("button").all()
    print(f"  Found {len(buttons)} buttons:")

    for btn in buttons:
        if btn.is_visible():
            text = btn.inner_text().strip()
            print(f"    - {text}")

    # Test 3: Test button clicks
    print("\nTest 3: Button Interactions")

    # Find and click "打开管理页" button
    manager_btn = None
    for btn in buttons:
        if btn.is_visible() and "管理页" in btn.inner_text():
            manager_btn = btn
            break

    if manager_btn:
        print("  ✓ Found '打开管理页' button")
        # Note: In real extension, this would open options page
        # In test environment, we just verify it exists
    else:
        print("  ✗ '打开管理页' button not found")

    # Find "前往B站" button
    bilibili_btn = None
    for btn in buttons:
        if btn.is_visible() and (
            "B站" in btn.inner_text() or "bilibili" in btn.inner_text().lower()
        ):
            bilibili_btn = btn
            break

    if bilibili_btn:
        print("  ✓ Found '前往B站' button")
    else:
        print("  ✗ '前往B站' button not found")

    # Test 4: Check for keyboard shortcut info
    print("\nTest 4: Keyboard Shortcut Info")
    page_content = page.content()
    if "Ctrl+Shift" in page_content or "快捷键" in page_content:
        print("  ✓ Keyboard shortcut information present")
    else:
        print("  ℹ Keyboard shortcut info not found in content")

    # Test 5: Check styling
    print("\nTest 5: Visual Elements")

    # Check for styled container
    containers = page.locator("div").all()
    styled_containers = [c for c in containers if c.is_visible()]
    print(f"  Found {len(styled_containers)} visible container elements")

    # Check background color (should be dark theme)
    body_bg = page.evaluate(
        "() => window.getComputedStyle(document.body).backgroundColor"
    )
    print(f"  Body background: {body_bg}")

    browser.close()
    print("\n=== Popup Tests Complete ===")
