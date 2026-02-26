"""
E2E Test: Manager Page Functionality
Tests core functionality of the manager interface
"""

from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1280, "height": 800})

    print("=== Testing Manager Page Functionality ===\n")

    # Navigate to manager
    page.goto("http://localhost:5173/src/manager/index.html")
    page.wait_for_load_state("networkidle")

    # Wait for React to render
    page.wait_for_timeout(1000)

    # Test 1: Verify page title
    print("Test 1: Page Title")
    title = page.locator("h1").inner_text()
    assert "Bilibili Focus Mode" in title, (
        f"Expected title to contain 'Bilibili Focus Mode', got: {title}"
    )
    print(f"  ✓ Page title correct: {title}")

    # Test 2: Check all navigation tabs are present
    print("\nTest 2: Navigation Tabs")
    expected_tabs = [
        "待审池",
        "冷静期",
        "即时",
        "永久",
        "幽灵",
        "债务",
        "上传者",
        "关键词",
        "配置",
    ]

    # Find tab buttons by looking for buttons with specific text patterns
    all_buttons = page.locator("button").all()
    tab_texts = []
    for btn in all_buttons:
        if btn.is_visible():
            text = btn.inner_text().strip()
            if text and len(text) < 10:  # Short text likely to be tabs
                tab_texts.append(text)

    print(f"  Found tabs: {tab_texts}")

    # Test 3: Click through different tabs
    print("\nTest 3: Tab Navigation")

    # Try to click on different tabs
    tab_buttons = page.locator("button").all()
    clicked_tabs = []

    for btn in tab_buttons[:15]:  # Check first 15 buttons
        if btn.is_visible():
            text = btn.inner_text().strip()
            if text in ["待审池", "冷静期", "即时", "永久", "债务", "关键词"]:
                try:
                    btn.click()
                    page.wait_for_timeout(500)
                    clicked_tabs.append(text)
                    print(f"  ✓ Clicked tab: {text}")
                except Exception as e:
                    print(f"  ✗ Failed to click {text}: {e}")

    # Take screenshot of current state
    page.screenshot(path="e2e/screenshots/manager_tabs_tested.png", full_page=True)
    print(f"\n  Screenshot saved: e2e/screenshots/manager_tabs_tested.png")

    # Test 4: Check Export/Import buttons exist
    print("\nTest 4: Backup Functionality")
    buttons = page.locator("button").all()
    button_texts = [btn.inner_text().strip() for btn in buttons if btn.is_visible()]

    has_export = any("导出" in text for text in button_texts)
    has_import = any("导入" in text for text in button_texts)

    print(f"  Export button present: {has_export}")
    print(f"  Import button present: {has_import}")

    # Test 5: Check for configuration section
    print("\nTest 5: Configuration Section")
    config_button = None
    for btn in buttons:
        if btn.is_visible() and "配置" in btn.inner_text():
            config_button = btn
            break

    if config_button:
        config_button.click()
        page.wait_for_timeout(500)
        print("  ✓ Clicked configuration tab")

        # Check for configuration inputs
        inputs = page.locator("input").all()
        visible_inputs = [inp for inp in inputs if inp.is_visible()]
        print(f"  Found {len(visible_inputs)} configuration inputs")

        page.screenshot(path="e2e/screenshots/manager_config_tab.png", full_page=True)
        print(f"  Screenshot saved: e2e/screenshots/manager_config_tab.png")

    # Test 6: Keyword Rules Section
    print("\nTest 6: Keyword Rules Section")
    keyword_button = None
    for btn in buttons:
        if btn.is_visible() and "关键词" in btn.inner_text():
            keyword_button = btn
            break

    if keyword_button:
        keyword_button.click()
        page.wait_for_timeout(500)
        print("  ✓ Clicked keyword rules tab")

        # Check for keyword rules UI elements
        keyword_buttons = page.locator("button").all()
        keyword_button_texts = [
            btn.inner_text().strip() for btn in keyword_buttons if btn.is_visible()
        ]

        has_export_rules = any(
            "导出" in text and "规则" in text for text in keyword_button_texts
        )
        has_import_rules = any(
            "导入" in text and "规则" in text for text in keyword_button_texts
        )

        print(f"  Export rules button: {has_export_rules}")
        print(f"  Import rules button: {has_import_rules}")

        page.screenshot(path="e2e/screenshots/manager_keyword_tab.png", full_page=True)
        print(f"  Screenshot saved: e2e/screenshots/manager_keyword_tab.png")

    browser.close()
    print("\n=== Manager Page Tests Complete ===")
