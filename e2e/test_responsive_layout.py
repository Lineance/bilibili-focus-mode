"""
E2E Test: Responsive Layout Testing
Tests the manager page at different viewport sizes
"""

from playwright.sync_api import sync_playwright

viewports = [
    {"name": "Desktop", "width": 1920, "height": 1080},
    {"name": "Laptop", "width": 1366, "height": 768},
    {"name": "Tablet", "width": 768, "height": 1024},
    {"name": "Mobile", "width": 375, "height": 667},
]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    print("=== Responsive Layout Testing ===\n")

    for viewport in viewports:
        print(f"Testing {viewport['name']} ({viewport['width']}x{viewport['height']})")

        page = browser.new_page(
            viewport={"width": viewport["width"], "height": viewport["height"]}
        )
        page.goto("http://localhost:5173/src/manager/index.html")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(500)

        # Take screenshot
        screenshot_path = f"e2e/screenshots/responsive_{viewport['name'].lower()}.png"
        page.screenshot(path=screenshot_path, full_page=True)
        print(f"  Screenshot saved: {screenshot_path}")

        # Check for layout issues
        # Count visible elements
        buttons = page.locator("button").all()
        visible_buttons = [b for b in buttons if b.is_visible()]
        print(f"  Visible buttons: {len(visible_buttons)}")

        # Check if critical elements are visible
        headings = page.locator("h1").all()
        visible_headings = [h for h in headings if h.is_visible()]
        print(f"  Visible headings: {len(visible_headings)}")

        # Check page dimensions
        page_dims = page.evaluate(
            "() => ({ width: window.innerWidth, height: document.body.scrollHeight })"
        )
        print(f"  Page dimensions: {page_dims['width']}x{page_dims['height']}px")

        page.close()
        print()

    browser.close()
    print("=== Responsive Testing Complete ===")
