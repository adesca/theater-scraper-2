import type {ReactElement} from "react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {render} from "@testing-library/react";
import {vi} from "vitest";
import type {Listing, Venue} from "../../../models";

/**
 * Stub `fetch` so the react-query hooks (`useFetchListings` / `useFetchVenues`) resolve with
 * canned data. Dispatches on the request URL, so both endpoints are covered by one mock.
 */
export function mockApi(data: { listings?: Listing[]; venues?: Venue[] }) {
    vi.stubGlobal("fetch", vi.fn((url: string) => {
        const body = url.includes("/venues")
            ? {venues: data.venues ?? []}
            : {listings: data.listings ?? []};
        return Promise.resolve({json: () => Promise.resolve(body)});
    }));
}

/** Render `ui` inside a fresh QueryClient (retries off so failures surface immediately). */
export function renderWithClient(ui: ReactElement) {
    const client = new QueryClient({defaultOptions: {queries: {retry: false}}});
    return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

/** Collapse whitespace so assertions can match text that JSX splits across nodes. */
export function normText(el: Element | null): string {
    return (el?.textContent ?? "").replace(/\s+/g, " ").trim();
}

export function makeVenue(overrides: Partial<Venue> & Pick<Venue, "theaterName" | "address">): Venue {
    return {
        id: overrides.theaterName,
        website: "https://example.com",
        ...overrides,
    };
}

export function makeListing(overrides: Partial<Listing> & Pick<Listing, "name" | "company">): Listing {
    return {
        startDate: "2026-08-01",
        endDate: "2026-08-15",
        imageUrl: null,
        listingUrl: "",
        ...overrides,
    } as Listing;
}
