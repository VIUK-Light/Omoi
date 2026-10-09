"""Read the final review document in Chromium; never publish or apply questions."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import hashlib
import json
import os
import threading

from playwright.sync_api import sync_playwright

FOLDER = Path(__file__).resolve().parent


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def check():
    proposal_path = FOLDER / 'proposal.json'
    html_path = FOLDER / 'review.html'
    proposal = json.loads(proposal_path.read_text())
    rows = {r['card']['id']: r for r in proposal['additions']}
    old = json.loads((FOLDER / 'review-ui-check.json').read_text())
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(FOLDER)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    os.environ['PLAYWRIGHT_BROWSERS_PATH'] = '/tmp/omoi-playwright'
    errors = []
    checks = []
    try:
        with sync_playwright() as engine:
            browser = engine.chromium.launch(headless=True)
            page = browser.new_page(viewport={'width': 1280, 'height': 900})
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(f'http://127.0.0.1:{server.server_port}/review.html')
            assert [page.locator('#' + key).inner_text() for key in ['current', 'added', 'total']] == ['942', '3,768', '4,710']
            assert page.locator('#rows > tr').count() == 60
            checks.append('final_counts_and_initial_rows')
            page.locator('#category').select_option('family_and_care')
            assert page.locator('#count').inner_text() == '253 / 3,768問'
            page.locator('#level').select_option('4')
            assert page.locator('#count').inner_text() == '105 / 3,768問'
            page.locator('#next').click()
            assert page.locator('#rows > tr').count() == 45
            checks.append('final_category_level_counts_and_pagination')
            page.locator('#category').select_option('')
            page.locator('#level').select_option('')
            for cid in ['exp26-care-0031', 'exp26-care-0660', 'exp26-learning-0310', 'exp26-civic-0546', 'exp26-livelihood-0269', 'exp26-civic-0021', 'exp26-civic-0284']:
                row = rows[cid]
                page.locator('#search').fill(cid)
                assert page.locator('#count').inner_text() == '1 / 3,768問'
                assert page.locator('#rows .question').inner_text() == row['card']['question']
                page.locator('#rows > tr > td:nth-child(2) > details > summary').click()
                text = page.locator('#rows > tr > td:nth-child(2) > details > .body').inner_text()
                assert row['reason'] in text
                if row['card'].get('detail'):
                    assert row['card']['detail']['text'] in text
            checks.append('seven_final_revised_questions_backgrounds_and_reasons')
            page.locator('#search').fill('exp26-care-0170')
            page.locator('#rows > tr > td:nth-child(2) > details > summary').click()
            source = rows['exp26-care-0170']['card']['detail']['sources'][0]
            assert page.locator('#rows a').first.get_attribute('href') == source['url']
            checks.append('final_source_anchor')
            page.locator('#search').fill('存在しないID-final-ui-check')
            assert page.locator('#count').inner_text() == '0 / 3,768問'
            assert page.locator('#rows .empty').count() == 1
            checks.append('final_empty_search')
            page.set_viewport_size({'width': 390, 'height': 844})
            page.locator('#search').fill('exp26-care-0660')
            assert page.locator('#rows .question').inner_text() == rows['exp26-care-0660']['card']['question']
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            checks.append('final_mobile_render_and_search')
            assert not errors, errors
            checks.append('no_page_errors')
            browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)
    result = {
        'status': 'passed',
        'scope': 'Final pending proposal and its exact review.html in headless Chromium. Prior UI behavior checks are preserved separately.',
        'proposal_sha256': hashlib.sha256(proposal_path.read_bytes()).hexdigest(),
        'review_html_sha256': hashlib.sha256(html_path.read_bytes()).hexdigest(),
        'checks': checks,
        'prior_interim_check': old.get('prior_interim_check', old),
        'production_files_written': 0,
    }
    (FOLDER / 'review-ui-check.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'status': 'passed', 'final_browser_checks': len(checks)}, ensure_ascii=False))


if __name__ == '__main__':
    check()
