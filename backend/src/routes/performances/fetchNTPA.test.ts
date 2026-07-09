import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { parse } from 'date-fns'
import { ticketsPage } from './ntpaFixtures'
import { fetchWithDailyCache } from '../../services/fetchHandler'
import { getNTPAPerformances } from './fetchNTPA'

// The module under test pulls its HTML from fetchWithDailyCache. We replace it
// with a mock so tests are fully deterministic and never hit the network.
vi.mock('../../services/fetchHandler', () => ({
    fetchWithDailyCache: vi.fn(),
}))

const mockFetch = vi.mocked(fetchWithDailyCache)

// A fixed "now" so that date parsing (which uses `new Date()` only to supply the
// year) and the resulting ISO strings are stable across machines and runs.
const NOW = new Date('2026-07-09T12:00:00Z')

// Compute an expected ISO string exactly the way the production code does, so
// the assertion is independent of the runner's timezone.
function expectedIso(dateText: string): string {
    return parse(dateText, 'MMMM d', new Date()).toISOString()
}

/**
 * Build a single `.fusion-events-post` node matching the real NTPA markup.
 * `linkText` is the text of the show-detail anchor (the one WITHOUT a span),
 * which is what the scraper parses for name/company.
 */
function buildPost(opts: {
    href?: string
    linkText: string
    startDate?: string
    endDate?: string
    imageUrl?: string
    includeThumbnail?: boolean
    // When true, the detail anchor also wraps a span, so `a:not(:has(span))`
    // matches nothing and the listing is dropped.
    detailLinkHasSpan?: boolean
}): string {
    const {
        href = 'https://ntpa.org/event/example/',
        linkText,
        startDate = 'July 2',
        endDate = 'July 11',
        imageUrl = 'https://ntpa.org/wp-content/uploads/example.jpg',
        includeThumbnail = true,
        detailLinkHasSpan = false,
    } = opts

    const thumbnail = includeThumbnail
        ? `<div class="fusion-events-thumbnail hover-type-none">
             <a href="${href}" class="url" rel="bookmark" aria-label="thumb">
               <span class="tribe-events-event-image" style="background-image: url(${imageUrl}); background-size: cover;"></span>
             </a>
           </div>`
        : ''

    const detailInner = detailLinkHasSpan ? `<span>${linkText}</span>` : linkText

    return `<div class="fusion-events-post fusion-spacing-yes fusion-one-fourth fusion-layout-column">
        <div class="fusion-column-wrapper">
            ${thumbnail}
            <div class="fusion-events-content-wrapper">
                <div class="fusion-events-meta">
                    <h2><a href="${href}" class="url" rel="bookmark">${detailInner}</a></h2>
                    <h4>
                        <span class="tribe-event-date-start">${startDate}</span> -
                        <span class="tribe-event-date-end">${endDate}</span>
                    </h4>
                </div>
            </div>
        </div>
    </div>`
}

function buildPage(...posts: string[]): string {
    return `<html><body><div class="fusion-events-wrapper">${posts.join('')}</div></body></html>`
}

beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    mockFetch.mockReset()
})

afterEach(() => {
    vi.useRealTimers()
})

describe('getNTPAPerformances - real fixture page', () => {
    beforeEach(() => {
        mockFetch.mockResolvedValue({ body: ticketsPage, cachedAt: NOW })
    })

    test('fetches the NTPA tickets page exactly once', async () => {
        await getNTPAPerformances()

        expect(mockFetch).toHaveBeenCalledTimes(1)
        expect(mockFetch).toHaveBeenCalledWith('https://ntpa.org/tickets/')
    })

    test('returns one Listing per .fusion-events-post in the page', async () => {
        const listings = await getNTPAPerformances()

        expect(Array.isArray(listings)).toBe(true)
        expect(listings).toHaveLength(14)
    })

    test('fully maps the first listing (1776)', async () => {
        const [first] = await getNTPAPerformances()

        expect(first).toEqual({
            name: '1776',
            // company keeps the raw text before "»", including its trailing space.
            company: 'NTPA - Community Theatre Performances, Plano Performances ',
            id: 'https://ntpa.org/event/1776-community-theatre-plano/',
            imageUrl: 'https://ntpa.org/wp-content/uploads/2025/09/1776-temp-logo.jpg',
            tags: [],
            startDate: expectedIso('July 2'),
            endDate: expectedIso('July 11'),
        })
    })

    test('parses a listing whose name and category contain multiple dashes (Rocky Horror)', async () => {
        const listings = await getNTPAPerformances()
        const rocky = listings.find(l => l.id.includes('rocky-horror-show-repertory'))

        expect(rocky).toBeDefined()
        expect(rocky!.name).toBe('The Rocky Horror Show')
        expect(rocky!.company).toBe('NTPA - Plano Performances, Repertory Theatre Performances ')
        expect(rocky!.startDate).toBe(expectedIso('October 30'))
        expect(rocky!.endDate).toBe(expectedIso('November 8'))
    })

    test('every listing is well-formed', async () => {
        const listings = await getNTPAPerformances()

        for (const listing of listings) {
            expect(listing.name.length).toBeGreaterThan(0)
            expect(listing.name).toBe(listing.name.trim())
            expect(listing.company.startsWith('NTPA - ')).toBe(true)
            expect(listing.id).toMatch(/^https:\/\/ntpa\.org\/event\//)
            expect(listing.imageUrl).toMatch(/^https?:\/\/.+/)
            expect(listing.tags).toEqual([])
            // Dates round-trip as valid ISO strings (parse did not yield NaN).
            expect(Number.isNaN(Date.parse(listing.startDate))).toBe(false)
            expect(Number.isNaN(Date.parse(listing.endDate))).toBe(false)
        }
    })

    test('preserves document order of the listings', async () => {
        const listings = await getNTPAPerformances()

        expect(listings[0].id).toContain('1776-community-theatre-plano')
        expect(listings[listings.length - 1].id).toContain('rocky-horror-show-repertory')
    })
})

describe('getNTPAPerformances - name & company parsing', () => {
    test('splits the name from the "»" and first "–" delimiters and trims it', async () => {
        mockFetch.mockResolvedValue({
            body: buildPage(
                buildPost({
                    linkText: 'Plano Performances » Aladdin JR (2-Week Production) – Plano – Willow Bend',
                    href: 'https://ntpa.org/event/aladdin-jr-plano/',
                }),
            ),
            cachedAt: NOW,
        })

        const [listing] = await getNTPAPerformances()

        expect(listing.name).toBe('Aladdin JR (2-Week Production)')
        expect(listing.company).toBe('NTPA - Plano Performances ')
    })

    test('keeps unicode characters (curly apostrophe) intact in the name', async () => {
        mockFetch.mockResolvedValue({
            body: buildPage(
                buildPost({ linkText: 'Plano Performances » Disney’s Camp Rock – Plano – Starcatchers' }),
            ),
            cachedAt: NOW,
        })

        const [listing] = await getNTPAPerformances()

        expect(listing.name).toBe('Disney’s Camp Rock')
    })

    test('uses the anchor href as the listing id', async () => {
        mockFetch.mockResolvedValue({
            body: buildPage(
                buildPost({
                    href: 'https://ntpa.org/event/some-show/',
                    linkText: 'Frisco Performances » Some Show – Frisco',
                }),
            ),
            cachedAt: NOW,
        })

        const [listing] = await getNTPAPerformances()

        expect(listing.id).toBe('https://ntpa.org/event/some-show/')
    })
})

describe('getNTPAPerformances - date parsing', () => {
    test('parses "MMMM d" start and end dates into ISO strings for the current year', async () => {
        mockFetch.mockResolvedValue({
            body: buildPage(
                buildPost({
                    linkText: 'Plano Performances » Show – Plano',
                    startDate: 'August 7',
                    endDate: 'August 16',
                }),
            ),
            cachedAt: NOW,
        })

        const [listing] = await getNTPAPerformances()

        expect(listing.startDate).toBe(expectedIso('August 7'))
        expect(listing.endDate).toBe(expectedIso('August 16'))
        // Year defaults to the reference year (mocked to 2026).
        expect(listing.startDate).toContain('2026-')
    })
})

describe('getNTPAPerformances - image extraction', () => {
    test('strips the url("…") wrapper from the background-image style', async () => {
        mockFetch.mockResolvedValue({
            body: buildPage(
                buildPost({
                    linkText: 'Plano Performances » Show – Plano',
                    imageUrl: 'https://example.com/poster.png',
                }),
            ),
            cachedAt: NOW,
        })

        const [listing] = await getNTPAPerformances()

        expect(listing.imageUrl).toBe('https://example.com/poster.png')
    })

    test('falls back to an empty string when there is no image span', async () => {
        mockFetch.mockResolvedValue({
            // No thumbnail => the detail anchor still matches, but there is no `a span`.
            body: buildPage(
                buildPost({
                    linkText: 'Plano Performances » Show – Plano',
                    includeThumbnail: false,
                }),
            ),
            cachedAt: NOW,
        })

        const [listing] = await getNTPAPerformances()

        expect(listing.imageUrl).toBe('')
    })
})

describe('getNTPAPerformances - filtering & edge cases', () => {
    test('returns an empty array when the page has no event posts', async () => {
        mockFetch.mockResolvedValue({
            body: '<html><body><div class="something-else"></div></body></html>',
            cachedAt: NOW,
        })

        const listings = await getNTPAPerformances()

        expect(listings).toEqual([])
    })

    test('drops posts that have no show-detail anchor (every anchor wraps a span)', async () => {
        mockFetch.mockResolvedValue({
            body: buildPage(
                buildPost({
                    linkText: 'Plano Performances » Keeps Me – Plano',
                    href: 'https://ntpa.org/event/keeper/',
                }),
                buildPost({
                    linkText: 'Plano Performances » Dropped – Plano',
                    detailLinkHasSpan: true,
                }),
            ),
            cachedAt: NOW,
        })

        const listings = await getNTPAPerformances()

        expect(listings).toHaveLength(1)
        expect(listings[0].id).toBe('https://ntpa.org/event/keeper/')
    })

    test('maps multiple valid listings in order', async () => {
        mockFetch.mockResolvedValue({
            body: buildPage(
                buildPost({ linkText: 'A » First – X', href: 'https://ntpa.org/event/first/' }),
                buildPost({ linkText: 'B » Second – Y', href: 'https://ntpa.org/event/second/' }),
                buildPost({ linkText: 'C » Third – Z', href: 'https://ntpa.org/event/third/' }),
            ),
            cachedAt: NOW,
        })

        const listings = await getNTPAPerformances()

        expect(listings.map(l => l.name)).toEqual(['First', 'Second', 'Third'])
        expect(listings.map(l => l.company)).toEqual(['NTPA - A ', 'NTPA - B ', 'NTPA - C '])
    })

    test('propagates errors thrown by the fetch layer', async () => {
        mockFetch.mockRejectedValue(new Error('network down'))

        await expect(getNTPAPerformances()).rejects.toThrow('network down')
    })

    // Documents current behaviour: a detail link whose text lacks the "»"
    // delimiter causes name parsing to throw (split('»')[1] is undefined).
    test('throws when a listing link text is missing the "»" delimiter', async () => {
        mockFetch.mockResolvedValue({
            body: buildPage(buildPost({ linkText: 'No delimiter present here' })),
            cachedAt: NOW,
        })

        await expect(getNTPAPerformances()).rejects.toThrow()
    })
})
