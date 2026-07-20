import {fetchWithDailyCache} from "../services/fetchHandler";
import {getMonth, parse, setYear, subYears} from "date-fns";
import {parseDocument} from "../helper";
import {Listing} from "../../../models";

const MONTH_REGEX =
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i;

export async function getBreakLegPerformances(): Promise<Listing[]> {
    const {body: html, cachedAt} = await fetchWithDailyCache('https://goodshow.breaklegs.com/performances-by-show/')

    const {$$} = parseDocument(html)

    const $individualListings = $$('.listings li');

    const listings = [...$individualListings].map(el => {
        const dateSectionText = el.querySelector('.dates')!.textContent;

        const {startDate, endDate} = parseDateRange(dateSectionText)

        const image = el.querySelector("span.image") as unknown as HTMLSpanElement;
        const imageUrl: string | null = image.style.backgroundImage.match(/^url\(["']?(.*?)["']?\)$/)?.[1] ?? null;

        const retval = {
            source: 'breaklegs',
            name: el.querySelector('.text')?.textContent,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            company: el.querySelector('.detail-text')?.textContent,
            id: el.attributes.getNamedItem('data-id')?.value,
            tags: [...el.querySelectorAll('.filters span')].map(el => el.textContent),
            listingUrl: 'https://goodshow.breaklegs.com' + (el.querySelector('a.view:not(.tpane)') as HTMLAnchorElement).href,
            timeOfFetch: cachedAt.toISOString(),
            imageUrl
        }

        return retval;
    })

    return listings.filter(l => l.name && l.company) as Listing[];
}

export async function getBreakLegTheaters() {
    const {body: html} = await fetchWithDailyCache('https://goodshow.breaklegs.com/directory/')
    const {$, $$} = parseDocument(html)

    const theaters = [...$$('.listings li')].map((el) => {

        const theaterName = el.querySelector('.contents p.text')!.textContent;
        return {
            id: el.dataset.id || theaterName,
            theaterName,
            address: el.querySelector('.contents p.detail-text')!.textContent,
            website: el.querySelector('.contents p.details')!.textContent
        }
    });

    return theaters;
}


const DEFAULT_YEAR = 2026;

export function parseDateRange(dateSectionText: string): {
    startDate: Date;
    endDate: Date;
} {
    const match = dateSectionText.match(MONTH_REGEX);
    if (!match?.index) {
        throw new Error(`Could not find month in "${dateSectionText}"`);
    }

    const dateString = dateSectionText.slice(match.index).trim();

    // Single date
    if (!dateString.includes("-")) {
        const date = parse(dateString, "MMMM d", new Date());
        const withYear = setYear(date, DEFAULT_YEAR);

        return {
            startDate: withYear,
            endDate: withYear,
        };
    }

    let [startText, endText] = dateString.split("-").map(s => s.trim());

    // Determine the year for the range.
    const yearMatch = endText.match(/,\s*(\d{4})$/);
    const year = yearMatch ? Number(yearMatch[1]) : DEFAULT_YEAR;

    // Remove the year before parsing.
    endText = endText.replace(/,\s*\d{4}$/, "");

    // Parse the start date.
    let startDate = parse(startText, "MMMM d", new Date());
    startDate = setYear(startDate, year);

    // If the end only specifies a day, reuse the start month.
    if (/^\d+$/.test(endText)) {
        const month = startText.split(" ")[0];
        endText = `${month} ${endText}`;
    }

    let endDate = parse(endText, "MMMM d", new Date());
    endDate = setYear(endDate, year);

    // Handle ranges crossing a year boundary, e.g.
    // "December 30 - January 2, 2027"
    if (getMonth(startDate) > getMonth(endDate)) {
        startDate = subYears(startDate, 1);
    }

    return {
        startDate,
        endDate,
    };
}