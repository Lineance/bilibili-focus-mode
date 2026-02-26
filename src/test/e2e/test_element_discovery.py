"""
E2E Test: Page Element Discovery for Bilibili Focus Mode Manager
Tests the manager page to discover all interactive elements
Note: Manager page requires Chrome APIs, so we focus on popup which works better
"""

from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    # Test popup page (which works without Chrome APIs)
    print("=== Bilibili Focus Mode - Element Discovery ===\n")
    print("Testing Popup Page (Manager requires Chrome extension context)\n")

    page.goto("http://localhost:5173/src/popup/index.html")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1000)

    # Take initial screenshot
    page.screenshot(path="src/test/e2e/screenshots/popup_discovery.png", full_page=True)
    print("Screenshot saved: src/test/e2e/screenshots/popup_discovery.png\n")

    # Discover all buttons
    buttons = page.locator("button").all()
    visible_buttons = [btn for btn in buttons if btn.is_visible()]
    print(f"Found {len(visible_buttons)} visible buttons:")
    for i, button in enumerate(visible_buttons):
        text = button.inner_text().strip()
        print(f"  [{i}] {text}")

    # Discover links
    print("\n=== Links ===")
    links = page.locator("a[href]").all()
    visible_links = [link for link in links if link.is_visible()]
    print(f"Found {len(visible_links)} visible links:")
    for link in visible_links[:5]:
        text = link.inner_text().strip()[:30]
        href = link.get_attribute("href")
        print(f"  - {text} -> {href}")

    # Discover headings
    print("\n=== Headings ===")
    headings = page.locator("h1, h2, h3").all()
    visible_headings = [h for h in headings if h.is_visible()]
    print(f"Found {len(visible_headings)} visible headings:")
    for heading in visible_headings:
        text = heading.inner_text().strip()
        level = heading.evaluate("el => el.tagName")
        print(f"  {level}: {text}")

    # Check page structure
    print("\n=== Page Structure ===")
    html = page.content()
    print(f"  HTML length: {len(html)} chars")
    print(f"  Has body tag: {'<body' in html}")
    print(f"  Has script tags: {'<script' in html}")
    print(f"  Has style tags: {'<style' in html or 'stylesheet' in html}")

    browser.close()
    print("\n=== Element Discovery Complete ===")
    print("\nNote: Manager page requires Chrome extension context.")
    print("Popup page tested successfully.")
