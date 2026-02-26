"""
E2E Test: Page Element Discovery for Bilibili Focus Mode Manager
Tests the manager page to discover all interactive elements
"""

from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    # Navigate to manager page
    page.goto("http://localhost:5173/src/manager/index.html")
    page.wait_for_load_state("networkidle")

    print("=== Bilibili Focus Mode Manager - Element Discovery ===\n")

    # Take initial screenshot
    page.screenshot(path="e2e/screenshots/manager_initial.png", full_page=True)
    print("Screenshot saved: e2e/screenshots/manager_initial.png\n")

    # Discover all buttons
    buttons = page.locator("button").all()
    print(f"Found {len(buttons)} buttons:")
    for i, button in enumerate(buttons):
        if button.is_visible():
            text = button.inner_text().strip()
            class_attr = button.get_attribute("class") or ""
            print(f"  [{i}] {text} (class: {class_attr[:50]}...)")

    # Discover navigation tabs
    print("\n=== Navigation Tabs ===")
    tabs = page.locator('button, [role="tab"]').all()
    visible_tabs = [tab for tab in tabs if tab.is_visible()]
    print(f"Found {len(visible_tabs)} visible tabs/buttons:")
    for tab in visible_tabs[:10]:  # Show first 10
        text = tab.inner_text().strip()
        if text:
            print(f"  - {text}")

    # Discover links
    print("\n=== Links ===")
    links = page.locator("a[href]").all()
    print(f"Found {len(links)} links:")
    for link in links[:5]:
        if link.is_visible():
            text = link.inner_text().strip()[:30]
            href = link.get_attribute("href")
            print(f"  - {text} -> {href}")

    # Discover input fields
    print("\n=== Input Fields ===")
    inputs = page.locator("input, textarea, select").all()
    visible_inputs = [inp for inp in inputs if inp.is_visible()]
    print(f"Found {len(visible_inputs)} visible input fields:")
    for inp in visible_inputs:
        input_type = inp.get_attribute("type") or "text"
        name = (
            inp.get_attribute("name")
            or inp.get_attribute("id")
            or inp.get_attribute("placeholder")
            or "[unnamed]"
        )
        print(f"  - {name} (type: {input_type})")

    # Check for specific sections
    print("\n=== Page Sections ===")
    headings = page.locator("h1, h2, h3").all()
    for heading in headings:
        if heading.is_visible():
            text = heading.inner_text().strip()
            level = heading.evaluate("el => el.tagName")
            print(f"  {level}: {text}")

    # Test popup page
    print("\n\n=== Testing Popup Page ===")
    page.goto("http://localhost:5173/src/popup/index.html")
    page.wait_for_load_state("networkidle")

    page.screenshot(path="e2e/screenshots/popup_initial.png", full_page=True)
    print("Screenshot saved: e2e/screenshots/popup_initial.png\n")

    popup_buttons = page.locator("button").all()
    print(f"Popup has {len(popup_buttons)} buttons:")
    for btn in popup_buttons:
        if btn.is_visible():
            print(f"  - {btn.inner_text().strip()}")

    browser.close()
    print("\n=== Element Discovery Complete ===")
