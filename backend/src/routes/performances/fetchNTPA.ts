import {Listing} from "./models";
import {fetchWithDailyCache} from "../../services/fetchHandler";
import {HTMLAnchorElement, HTMLDivElement, HTMLSpanElement, Window} from "happy-dom";
import {parse} from "date-fns";

export async function getNTPAPerformances(): Promise<Listing[]> {
    const {body} = await fetchWithDailyCache('https://ntpa.org/tickets/')

    const window = new Window();
    const document = window.document;
    document.body.innerHTML = body;

    const retval = [...document.querySelectorAll('.fusion-events-post')]
        .map($listing => {
            const showDetailsLink = $listing.querySelector('a:not(:has(span))') as HTMLAnchorElement | null;
            if (!showDetailsLink) return null;
            const linkText = showDetailsLink.innerText;
            const startDateText = ($listing.querySelector('.tribe-event-date-start') as HTMLSpanElement).innerText;
            const endDateText = ($listing.querySelector('.tribe-event-date-end') as HTMLSpanElement).innerText;

            return {
                name: linkText.split('»')[1].split('–')[0].trim(),
                startDate: parse(startDateText, 'MMMM d', new Date()).toISOString(),
                endDate: parse(endDateText, 'MMMM d', new Date()).toISOString(),
                company: `NTPA - ${linkText.split('»')[0]}`,
                id: showDetailsLink.href,
                tags: [],
                imageUrl: (($listing.querySelector('a span') as HTMLSpanElement)?.style.backgroundImage.slice(5, -2) ?? "")
            }
        })
        .filter(listing => !!listing) as Listing[];

    return retval;
}
