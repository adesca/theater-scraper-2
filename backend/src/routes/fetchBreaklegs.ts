import {fetchWithDailyCache} from "../services/fetchHandler";
import {DOMParser} from 'linkedom';
import {parse, setYear} from "date-fns";
import {Listing} from "./performances/models";
import {parseDocument} from "../helper";

const MONTH_REGEX =
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i;

export async function getBreakLegPerformances(): Promise<Listing[]> {
    const {body: html} = await fetchWithDailyCache('https://goodshow.breaklegs.com/performances-by-show/')

    const {$$} = parseDocument(html)

    const $individualListings = $$('.listings li');

    const listings = [...$individualListings].map(el => {
        const dateSectionText = el.querySelector('.dates')!.textContent;
        const match = dateSectionText.match(MONTH_REGEX);

        const dateString = dateSectionText.slice(match!.index!);

        let dates;
        if (dateString.includes('-')) {
            dates = dateString.split('-');
            dates[0] = dates[0].trim();
            dates[1] = dates[1].trim();

            if (dates[1].match(/^\d+$/)) {
                const month = dates[0].split(" ")[0];
                dates[1] = `${month} ${dates[1]}`
            }
        } else {
            dates = [dateString.trim()]
        }


        let  startDate =  parse(dates[0], 'MMMM d', new Date());
        startDate = setYear(startDate, 2026)

        let endDate: Date | null= null
        if (dates[1]) {
            endDate =  parse(dates[1], 'MMMM d', new Date());
            endDate = setYear(endDate, 2026)
        } else {
            endDate = startDate;
        }

        const image = el.querySelector("span.image") as unknown as HTMLSpanElement;
        const imageUrl: string | null = image.style.backgroundImage.match(/^url\(["']?(.*?)["']?\)$/)?.[1] ?? null;

        const retval = {
            name: el.querySelector('.text')?.textContent,
            startDate: startDate.toISOString(),
            endDate: endDate?.toISOString(),
            company: el.querySelector('.detail-text')?.textContent,
            id: el.attributes.getNamedItem('data-id')?.value,
            tags: [...el.querySelectorAll('.filters span')].map(el => el.textContent),
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

        const theaterName = $('.contents p.text')!.textContent;
        return {
            id: el.dataset.id || theaterName,
            theaterName,
            address: el.querySelector('.contents p.detail-text')!.textContent,
            website: el.querySelector('.contents p.details')!.textContent
        }
    });

    return theaters;
}