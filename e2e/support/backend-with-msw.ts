import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import {ticketsPage} from "../../backend/src/routes/ntpaFixtures";

const breakLegPerformancesHtml = String.raw`
<!doctype html>
<html>
  <body>
    <ul class="listings">
      <li data-id="play-that-goes-wrong">
        <span class="image"></span>
        <span class="contents">
          <span class="text">The Play That Goes Wrong</span>
          <span class="detail-text">Chicago Stage Company</span>
          <span class="dates">On stage July 10 - July 21</span>
          <span class="filters"><span>comedy</span></span>
          <a class="view tpane" target="details" href="/performances/play-that-goes-wrong/?tpane">Select "play-that-goes-wrong"</a>
          <a class="view" href="/performances/play-that-goes-wrong/">Select "play-that-goes-wrong"</a>
        </span>
      </li>
      <li data-id="glass-menagerie">
        <span class="image"></span>
        <span class="contents">
          <span class="text">The Glass Menagerie</span>
          <span class="detail-text">Lakefront Theater</span>
          <span class="dates">On stage August 2 - August 9</span>
          <span class="filters"><span>drama</span></span>
          <a class="view tpane" target="details" href="/performances/glass-menagerie/?tpane">Select "glass-menagerie"</a>
          <a class="view" href="/performances/glass-menagerie/">Select "A Winter's Tale"</a>
        </span>
      </li>
      <li data-id="winters-tale">
        <span class="image"></span>
        <span class="contents">
          <span class="text">A Winter's Tale</span>
          <span class="detail-text">Prairie Repertory Theater</span>
          <span class="dates">On stage January 8 - January 18</span>
          <span class="filters"><span>drama</span></span>
          <a class="view tpane" target="details" href="/performances/winters-tale/?tpane">Select "A Winter's Tale"</a>
          <a class="view" href="/performances/winters-tale/">Select "A Winter's Tale"</a>
        </span>
      </li>
    </ul>
  </body>
</html>
`;

// Structure (ul.listings > li > .contents > p.text/.detail-text/.details) mirrors the real
// scraped directory page cached at backend/.cache/http/breaklegs-theaters-*.html. The two
// theaters below are placed in different DFW cities within the same "North Dallas" region
// (see CITIES_GROUPED in frontend/src/sidePanel/CityFilter.tsx) so e2e tests can exercise
// region counts and city-to-city filtering.
const breakLegTheatersHtml = String.raw`
<!doctype html>
<html>
  <body>
    <ul class="listings">
      <li data-id="chicago-stage-company">
        <span class="image"></span>
        <div class="contents">
          <p class="text">Chicago Stage Company</p>
          <p class="detail-text">100 Main St, Dallas, TX 75201</p>
          <p class="details"><a href="https://example.com/chicago-stage-company">https://example.com/chicago-stage-company</a></p>
        </div>
      </li>
      <li data-id="lakefront-theater">
        <span class="image"></span>
        <div class="contents">
          <p class="text">Lakefront Theater</p>
          <p class="detail-text">Richardson, TX</p>
          <p class="details"><a href="https://example.com/lakefront-theater">https://example.com/lakefront-theater</a></p>
        </div>
      </li>
    </ul>
  </body>
</html>
`;

const server = setupServer(
  http.get('https://goodshow.breaklegs.com/performances-by-show/', () => {
    return HttpResponse.text(breakLegPerformancesHtml, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
      },
    });
  }),

  http.get('https://goodshow.breaklegs.com/directory/', () => {
    return HttpResponse.text(breakLegTheatersHtml, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
      },
    });
  }),

    http.get('https://ntpa.org/tickets/', () => {
      return HttpResponse.text(ticketsPage, {
        headers: {
          'content-type': 'text/html; charset=utf-8',
        },
      });
    }),
);

async function main() {
  server.listen({
    onUnhandledRequest(request) {
      const url = new URL(request.url);

      if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') {
        return;
      }

      throw new Error(`Unhandled external request during e2e test: ${request.method} ${request.url}`);
    },
  });

  process.env.THEATER_SCRAPER_CACHE_DIR = await mkdtemp(
    join(tmpdir(), 'theater-scraper-e2e-cache-'),
  );

  await import('../../backend/src/server.ts');

  setInterval(() => {
    // Keep this Playwright-only bootstrap alive after importing the app server.
  }, 60_000);
}

void main();
