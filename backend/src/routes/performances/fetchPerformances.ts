import {load} from "cheerio";
import {fetchWithDailyCache} from "../../services/fetchHandler";

export async function getBreakLegPerformances() {
    const  html = fetchWithDailyCache("breaklegs-performances", 'https://goodshow.breaklegs.com/performances-by-show/')

    const $ = load(html);
    const $individualListings = $('.listings li');
    const listings = $individualListings.get().map(el => {
        const $listing = load(el);
        const dateString = $listing('.dates').text()
            .replace('Closes Today', '')
            .replace('Closes Tomorrow', '');
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
            dates = [dateString]
        }

        const retval = {
            name: $listing('.text').text(),
            startDate: dates[0],
            endDate: dates[1] ?? "n/a",
            company: $listing('.detail-text').text(),
            id: el.attribs['data-id'],
            tags: $listing('.filters span').get().map(el => load(el).text())
        }

        return retval;
    })

    return {listings}
}

export async function getBreakLegTheaters() {
    const directoryHtml = await (await  fetch('https://goodshow.breaklegs.com/directory/')).text();
    const $directoryPage = load(directoryHtml);
    const theaters = $directoryPage('.listings li').get().map((el) => {
        const $listing = load(el);
        const theaterName = $listing('.contents .text').text();
        return {
            id: el.attribs['data-id'] || theaterName,
            theaterName,
            address: $listing('.contents .detail-text').text(),
            website: $listing('.contents .details').text()
        }
    });

    return theaters;
}