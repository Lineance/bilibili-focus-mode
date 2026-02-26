# End-to-End Tests for Bilibili Focus Mode

This directory contains end-to-end tests using Playwright and the webapp-testing skill.

## Test Files

- `test_element_discovery.py` - Discovers and documents all UI elements
- `test_manager_functionality.py` - Tests manager page core functionality
- `test_popup_functionality.py` - Tests popup interface
- `test_responsive_layout.py` - Tests responsive design at different viewports
- `run_all_tests.py` - Test suite runner

## Prerequisites

1. Install Playwright:
```bash
pip install playwright
python -m playwright install chromium
```

2. Install webapp-testing skill (already installed at `~/.opencode/skills/webapp-testing`)

## Running Tests

### Option 1: Using the batch script (Windows)
```bash
src/test/e2e/run_e2e_tests.bat
```

This will:
1. Start the dev server on port 5173
2. Run all E2E tests
3. Automatically stop the server

### Option 2: Manual execution

1. Start dev server in one terminal:
```bash
npm run dev
```

2. Run tests in another terminal:
```bash
python src/test/e2e/run_all_tests.py
```

### Option 3: Using with_server.py helper
```bash
python %USERPROFILE%\.opencode\skills\webapp-testing\scripts\with_server.py \
    --server "npm run dev" --port 5173 \
    -- python src/test/e2e/test_element_discovery.py
```

## Test Output

- Screenshots are saved to `src/test/e2e/screenshots/`
- Console output shows test progress and results

## Writing New Tests

Use the webapp-testing skill patterns:

```python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    
    # Navigate and wait for load
    page.goto('http://localhost:5173/src/manager/index.html')
    page.wait_for_load_state('networkidle')
    
    # Your test logic here
    
    browser.close()
```

## Best Practices

1. Always use `headless=True` for automated tests
2. Always wait for `networkidle` before interacting
3. Take screenshots for visual verification
4. Use descriptive selectors (text, role, CSS)
5. Add appropriate waits for dynamic content
