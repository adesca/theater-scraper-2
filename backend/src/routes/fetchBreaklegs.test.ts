import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { parse, setYear } from 'date-fns'
import { fetchWithDailyCache } from '../services/fetchHandler'
import { getBreakLegPerformances } from './fetchBreaklegs'

// The module under test pulls its HTML from fetchWithDailyCache. We replace it
// with a mock so tests are fully deterministic and never hit the network.
vi.mock('../services/fetchHandler', () => ({
    fetchWithDailyCache: vi.fn(),
}))

const mockFetch = vi.mocked(fetchWithDailyCache)

const NOW = new Date('2026-07-09T12:00:00Z')

// Compute an expected ISO string exactly the way the production code does
// (year is always pinned to 2026 by the scraper, regardless of "now").
function expectedIso(dateText: string): string {
    return setYear(parse(dateText, 'MMMM d', new Date()), 2026).toISOString()
}

/**
 * Build a single `.listings li` node matching the real breaklegs markup:
 * `span.image` for the poster, `.contents p.text` / `p.detail-text` for the
 * name/company, a `.dates` block, and a `p.filters` list of tag spans.
 */
function buildListing(opts: {
    id?: string
    name?: string
    company?: string
    imageUrl?: string | null
    tags?: string[]
    // Raw inner HTML of the `.dates` div. Takes precedence over `dateText`,
    // which lets tests reproduce markup (e.g. a "New Listing" marker) that
    // isn't just a single plain date span.
    datesHtml?: string
    dateText?: string
}): string {
    const {
        id = 'listing-id',
        name = 'A Show',
        company = 'A Company',
        imageUrl = 'https://static.breaklegs.app/images/example/thumb.jpg',
        tags = [],
        dateText = 'July 2 - 11',
        datesHtml = `<span>${dateText}</span>`,
    } = opts

    const imageStyle = imageUrl ? `style="background-image:url(${imageUrl})"` : ''
    const tagsHtml = tags.map(t => `<span>${t}</span>`).join('')

    return `<li data-id="${id}" class='id-${id}'>
        <span class="image" ${imageStyle}></span>
        <div class="contents">
            <p class="text">${name}</p>
            <p class="detail-text">${company}</p>
            <p class="details">Some description.</p>
        </div>
        <div class="dates">
            ${datesHtml}
        </div>
        <p class="filters">${tagsHtml}</p>
        <a class="view tpane" target="details" href="/performances/${id}/?tpane">Select "${name}"</a>
        <a class="view" href="/performances/${id}/">Select "${name}"</a>
    </li>`
}

function buildPage(...listings: string[]): string {
    return `<html><body><ul class="listings">${listings.join('')}</ul></body></html>`
}

beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    mockFetch.mockReset()
})

afterEach(() => {
    vi.useRealTimers()
})

describe('getBreakLegPerformances - fetching', () => {
    test('fetches the breaklegs performances page exactly once', async () => {
        mockFetch.mockResolvedValue({ body: buildPage(buildListing({})), cachedAt: NOW })

        await getBreakLegPerformances()

        expect(mockFetch).toHaveBeenCalledTimes(1)
        expect(mockFetch).toHaveBeenCalledWith('https://goodshow.breaklegs.com/performances-by-show/')
    })

    test('returns one Listing per .listings li in the page', async () => {
        mockFetch.mockResolvedValue({
            body: buildPage(
                buildListing({ id: 'a', name: 'First', company: 'Co A' }),
                buildListing({ id: 'b', name: 'Second', company: 'Co B' }),
                buildListing({ id: 'c', name: 'Third', company: 'Co C' }),
            ),
            cachedAt: NOW,
        })

        const listings = await getBreakLegPerformances()

        expect(listings).toHaveLength(3)
        expect(listings.map(l => l.name)).toEqual(['First', 'Second', 'Third'])
    })

    test('propagates errors thrown by the fetch layer', async () => {
        mockFetch.mockRejectedValue(new Error('network down'))

        await expect(getBreakLegPerformances()).rejects.toThrow('network down')
    })
})

describe('getBreakLegPerformances - field mapping', () => {
    test('fully maps a listing', async () => {
        mockFetch.mockResolvedValue({
            body: buildPage(
                buildListing({
                    id: 'no-kissing',
                    name: 'No Kissing',
                    company: 'Theatre Noir Blanc',
                    imageUrl: 'https://static.breaklegs.app/images/audition/example/thumb.jpg',
                    tags: ['drama', 'original_work'],
                    dateText: 'July 2 - 11',
                }),
            ),
            cachedAt: NOW,
        })

        const [listing] = await getBreakLegPerformances()

        expect(listing).toEqual({
            name: 'No Kissing',
            company: 'Theatre Noir Blanc',
            id: 'no-kissing',
            tags: ['drama', 'original_work'],
            imageUrl: 'https://static.breaklegs.app/images/audition/example/thumb.jpg',
            startDate: expectedIso('July 2'),
            endDate: expectedIso('July 11'),
            listingUrl: 'https://goodshow.breaklegs.com/performances/no-kissing/',
            source: 'breaklegs',
            timeOfFetch: expect.stringContaining('Z')
        })
    })
})

describe('getBreakLegPerformances - date parsing', () => {
    test('parses a single date with no range as both start and end date', async () => {
        mockFetch.mockResolvedValue({
            body: buildPage(buildListing({ dateText: 'September 4' })),
            cachedAt: NOW,
        })

        const [listing] = await getBreakLegPerformances()

        expect(listing.startDate).toBe(expectedIso('September 4'))
        expect(listing.endDate).toBe(listing.startDate)
    })

    test('parses a same-month range where the end date is a bare day number', async () => {
        mockFetch.mockResolvedValue({
            body: buildPage(buildListing({ dateText: 'July 2 - 11' })),
            cachedAt: NOW,
        })

        const [listing] = await getBreakLegPerformances()

        expect(listing.startDate).toBe(expectedIso('July 2'))
        expect(listing.endDate).toBe(expectedIso('July 11'))
    })

    test('parses a cross-month range where the end date names its own month', async () => {
        mockFetch.mockResolvedValue({
            body: buildPage(buildListing({ dateText: 'June 18 - July 5' })),
            cachedAt: NOW,
        })

        const [listing] = await getBreakLegPerformances()

        expect(listing.startDate).toBe(expectedIso('June 18'))
        expect(listing.endDate).toBe(expectedIso('July 5'))
    })

    test('ignores a leading "New Listing" marker when locating the date range', async () => {
        mockFetch.mockResolvedValue({
            body: buildPage(
                buildListing({
                    datesHtml: `<span class="new">New Listing</span>
                        <span>September 4 - 13</span>`,
                }),
            ),
            cachedAt: NOW,
        })

        const [listing] = await getBreakLegPerformances()

        expect(listing.startDate).toBe(expectedIso('September 4'))
        expect(listing.endDate).toBe(expectedIso('September 13'))
    })

    test('ignores a leading "Closes in N Days" marker when locating the date range', async () => {
        mockFetch.mockResolvedValue({
            body: buildPage(
                buildListing({
                    datesHtml: `<span class="ending-soon">Closes in 3 Days</span>
                        <span>June 18 - July 5</span>`,
                }),
            ),
            cachedAt: NOW,
        })

        const [listing] = await getBreakLegPerformances()

        expect(listing.startDate).toBe(expectedIso('June 18'))
        expect(listing.endDate).toBe(expectedIso('July 5'))
    })
})

describe('getBreakLegPerformances - image extraction', () => {
    test('extracts the poster url from the background-image style', async () => {
        mockFetch.mockResolvedValue({
            body: buildPage(buildListing({ imageUrl: 'https://example.com/poster.jpg' })),
            cachedAt: NOW,
        })

        const [listing] = await getBreakLegPerformances()

        expect(listing.imageUrl).toBe('https://example.com/poster.jpg')
    })

    test('returns null when the image span has no background-image style', async () => {
        mockFetch.mockResolvedValue({
            body: buildPage(buildListing({ imageUrl: null })),
            cachedAt: NOW,
        })

        const [listing] = await getBreakLegPerformances()

        expect(listing.imageUrl).toBeNull()
    })
})

describe('getBreakLegPerformances - tags & filtering', () => {
    test('maps each .filters span to a tag', async () => {
        mockFetch.mockResolvedValue({
            body: buildPage(buildListing({ tags: ['drama', 'local_playwright', 'play'] })),
            cachedAt: NOW,
        })

        const [listing] = await getBreakLegPerformances()

        expect(listing.tags).toEqual(['drama', 'local_playwright', 'play'])
    })

    test('returns an empty tags array when there are no filters', async () => {
        mockFetch.mockResolvedValue({
            body: buildPage(buildListing({ tags: [] })),
            cachedAt: NOW,
        })

        const [listing] = await getBreakLegPerformances()

        expect(listing.tags).toEqual([])
    })

    test('drops listings that have no name or no company', async () => {
        mockFetch.mockResolvedValue({
            body: buildPage(
                buildListing({ id: 'missing-company', name: 'No Company Listed', company: '' }),
                buildListing({ id: 'kept', name: 'Complete Listing', company: 'Full Details Co' }),
            ),
            cachedAt: NOW,
        })

        const listings = await getBreakLegPerformances()

        expect(listings).toHaveLength(1)
        expect(listings[0].id).toBe('kept')
    })

    test('returns an empty array when the page has no listings', async () => {
        mockFetch.mockResolvedValue({
            body: '<html><body><ul class="listings"></ul></body></html>',
            cachedAt: NOW,
        })

        const listings = await getBreakLegPerformances()

        expect(listings).toEqual([])
    })
})

describe('getBreakLegPerformances - edge cases (known bugs)', () => {
    test('parses a "New Listing" date range whose end date carries an explicit year', async () => {
        mockFetch.mockResolvedValue({
            body: buildPage(
                buildListing({
                    id: 'year-spanning',
                    name: "Winter's Tale",
                    company: 'Riverside Rep',
                    datesHtml: `<span class="new">New Listing</span>
				<span>January 8 - 10, 2027</span>`,
                }),
            ),
            cachedAt: NOW,
        })

        const [listing] = await getBreakLegPerformances()

        expect(listing.startDate).toBe(new Date(2027, 0, 8).toISOString())
        expect(listing.endDate).toBe(new Date(2027, 0, 10).toISOString())
    })
})
