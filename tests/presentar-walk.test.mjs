// PRESENTAR WALK (2026-11-27, AA-16): run each Español story start to finish in Presentar en
// clase the way a teacher does on a projector. Press only Siguiente, plus the taps the bar
// asks for (a vote, Revelar, a fork's path or scene). Asserts that:
//   - the recap ("Resumen de la clase") opens at the end, and
//   - no Siguiente press ever moves the page UP by more than one screen (the "it sends me
//     back to the top" bug). Atrás is never pressed here.
// Projector sizes: 1440×660 and 1280×720.
//
// Needs Playwright with Chromium (pre-installed in Claude Code cloud sessions; elsewhere
// `npx playwright install chromium`). Run: npm run test:presentar
// StoryTrack.presentar is stubbed to resolve true (a signed-in teacher). Firebase and other
// outside hosts are blocked, so nothing is read or written anywhere.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { chromium = null; }

const ROOT = fileURLToPath(new URL('../public/', import.meta.url));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2' };

function serve() {
    const srv = createServer(async (req, res) => {
        try {
            let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
            if (p.endsWith('/')) p += 'index.html';
            const file = normalize(join(ROOT, p));
            if (!file.startsWith(ROOT)) throw new Error('outside');
            const body = await readFile(file);
            res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
            res.end(body);
        } catch { res.writeHead(404); res.end(); }
    });
    return new Promise((r) => srv.listen(0, '127.0.0.1', () => r(srv)));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function walk(browser, base, slug, viewport) {
    const ctx = await browser.newContext({ viewport });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.route('**/*', (route) => {
        const u = new URL(route.request().url());
        if (u.host !== new URL(base).host) return route.abort();
        if (u.pathname === '/js/auth-core.js' || u.pathname === '/js/telemetry.js') return route.abort();
        return route.continue();
    });
    // A signed-in teacher: StoryTrack.presentar resolves true.
    await page.route('**/js/story-tracking.js', async (route) => {
        const src = await readFile(join(ROOT, 'js/story-tracking.js'), 'utf8');
        route.fulfill({ contentType: 'text/javascript', body: src + '\nwindow.StoryTrack.presentar = Promise.resolve(true);\n' });
    });
    await page.goto(`${base}/espanol/${slug}/?mode=presentar&class=TEST01`);
    await page.waitForSelector('.pm-bar');
    await sleep(400);

    const vh = viewport.height;
    const log = [];
    const msg = () => page.$eval('#pm-msg', (m) => m.textContent.trim());
    const recapOpen = () => page.$('.pm-recap').then(Boolean);
    const y = () => page.evaluate(() => window.scrollY);
    const click = (sel) => page.evaluate((s) => { const el = document.querySelector(s); if (el) el.click(); return !!el; }, sel);
    // The first matching element that is on the page (laid out).
    const clickShown = (sel) => page.evaluate((s) => {
        const el = Array.from(document.querySelectorAll(s)).find((x) => x.getClientRects().length && !x.disabled);
        if (el) el.click(); return !!el;
    }, sel);

    let presses = 0, waits = 0;
    // PRESENTAR_SHOTS=<dir>: a screenshot the first time each bar message shows (for a PR).
    const SHOTS = process.env.PRESENTAR_SHOTS, shot = new Set();
    for (let step = 0; step < 400; step++) {
        if (await recapOpen()) break;
        const before = await y();
        await page.click('[data-pm="next"]');
        presses++;
        await sleep(350);
        const after = await y();
        const m = await msg();
        log.push(`${presses}: ${before}→${after} ${m}`);
        if (process.env.PRESENTAR_LOG) console.log(`# ${slug} ${viewport.width}: ${log[log.length - 1]}`);
        const pos = SHOTS ? await page.$eval('#pm-pos', (e) => e.textContent) : '';
        if (SHOTS && m && !shot.has(m + pos)) {
            shot.add(m + pos);
            await page.screenshot({ path: join(SHOTS, `${slug}-${viewport.width}-${String(presses).padStart(3, '0')}.png`) });
        }
        assert.ok(after >= before - vh, `${slug} ${viewport.width}×${vh}: Siguiente press ${presses} moved the page up from ${before} to ${after} (${m})\n${log.slice(-12).join('\n')}`);
        if (!m) continue;
        assert.doesNotMatch(m, /Elijan la respuesta de la clase en la historia/, `${slug}: the vote could not drive the story`);
        if (/cinco preguntas/.test(m)) { await clickShown('.ea-votes .ea-v, #ea-go'); continue; }
        if (/Primero voten|Falta el voto|Primero el voto/.test(m)) {
            // Vote "Casi todos" for the first option in each row still empty, then Revelar.
            await page.evaluate(() => {
                document.querySelectorAll('.pm-vote .pm-row').forEach((row) => {
                    if (!row.getClientRects().length || row.querySelector('[aria-pressed="true"]')) return;
                    const b = row.querySelector('.pm-v[data-q]'); if (b) b.click();
                });
            });
            await sleep(100);
            await clickShown('.pm-vote [data-reveal]');
            continue;
        }
        if (/Toquen Revelar/.test(m)) { await clickShown('.pm-vote [data-reveal]'); continue; }
        if (/No hay mayoría/.test(m)) { await clickShown('.pm-vote [data-tie]'); await clickShown('.pm-vote [data-reveal]'); continue; }
        if (/elijan un camino/.test(m)) {
            if (!(await clickShown('section.fork:not(.locked) .path'))) {
                if (!(await clickShown('section.fork:not(.locked) .opts .opt'))) await clickShown('section.fork:not(.locked) .mi');
            }
            continue;
        }
        if (/toquen una prenda/.test(m)) { await clickShown('.rack .shirt'); continue; }
        if (/campana/.test(m)) { await clickShown('.bell'); continue; }
        if (/respondan/.test(m)) {
            await page.evaluate(() => {
                const o = Array.from(document.querySelectorAll('section:not(.locked) .opts')).find((x) => x.getClientRects().length && !x.closest('.cv') && !x.querySelector('.opt.sel'));
                const b = o && o.querySelector('.opt:not(:disabled)'); if (b) b.click();
            });
            continue;
        }
        if (/pidan/.test(m)) { await clickShown('section.fork:not(.locked) .go'); continue; }
        if (/Un momento/.test(m)) {
            // The story is talking. Presentar goes on by itself when it is ready.
            waits++;
            for (let t = 0; t < 120 && /Un momento/.test(await msg()); t++) await sleep(250);
            continue;
        }
    }
    assert.ok(await recapOpen(), `${slug} ${viewport.width}×${vh}: the recap never opened\n${log.slice(-15).join('\n')}`);
    assert.deepEqual(errors, [], `${slug}: page errors`);
    await ctx.close();
    return { presses, waits };
}

const SIZES = [{ width: 1440, height: 660 }, { width: 1280, height: 720 }];
for (const slug of ['el-viaje', 'el-mundial']) {
    for (const viewport of SIZES) {
        test(`Presentar walk: ${slug} at ${viewport.width}×${viewport.height}, Siguiente only, never back up the page`, { skip: !chromium && 'Playwright is not installed', timeout: 600000 }, async () => {
            const srv = await serve();
            const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
            try {
                const { port } = srv.address();
                const r = await walk(browser, `http://127.0.0.1:${port}`, slug, viewport);
                assert.ok(r.presses > 10);
            } finally {
                await browser.close();
                srv.close();
            }
        });
    }
}
