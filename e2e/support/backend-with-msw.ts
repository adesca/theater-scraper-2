import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import {ticketsPage} from "../../backend/src/routes/performances/ntpaFixtures";

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
        </span>
      </li>
      <li data-id="glass-menagerie">
        <span class="image"></span>
        <span class="contents">
          <span class="text">The Glass Menagerie</span>
          <span class="detail-text">Lakefront Theater</span>
          <span class="dates">On stage August 2 - August 9</span>
          <span class="filters"><span>drama</span></span>
        </span>
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
