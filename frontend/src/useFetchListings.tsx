import {useQuery} from "@tanstack/react-query";
import type {Listing, Venue} from "../../models";
import {trackAction} from "./trackAction.tsx";
import {useFetchVenues} from "./sidePanel/CityFilter.tsx";
import {useFiltersStore} from "./filtersStore.ts";
import type {Filters} from "./models.ts";

const EMPTY_LISTINGS: Listing[] = [];

export function useFetchListings() {
    const track = trackAction();

    return useQuery({
        queryKey: ['listings'],
        queryFn: async () => {
            // A dead backend rejects rather than resolving, so the network case is
            // reported separately from a server that answered with an error status.
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/performances`
            ).catch((error: unknown) => {
                track("performances-load-failed", {reason: "network"});
                throw error;
            });

            if (!response.ok) {
                track("performances-load-failed", {reason: "http", status: response.status});
                throw new Error(`/performances responded ${response.status}`);
            }

            const data = await response.json() as {
                listings: Listing[];
            };

            track("performances-loaded", {
                count: data.listings.length,
            });

            return data;
        }
    })
}

function matchesSearch(listing: Listing, searchString: string): boolean {
    return listing.company.toLowerCase().includes(searchString)
        || listing.name.toLowerCase().includes(searchString)
}

function matchesDate(listing: Listing, date: Filters['date']): boolean {
    if (date === undefined) return true

    switch (date) {
        case 'starts this month':
            return new Date(listing.startDate).getMonth() === new Date().getMonth()
        case 'ends this month':
            return new Date(listing.endDate).getMonth() === new Date().getMonth()
        default:
            // A month was picked by index, so January is 0 -- checked against undefined
            // above rather than with isNaN, which would also swallow that 0.
            return new Date(listing.startDate).getMonth() === date
                || new Date(listing.endDate).getMonth() === date
    }
}

function matchesCity(listing: Listing, city: string | undefined, venues: Venue[]): boolean {
    if (!city) return true

    const venue = venues.find(
        v => v.theaterName.toLowerCase().trim() === listing.company.toLowerCase().trim()
    )

    // A listing whose company matches no known venue has no address to check against.
    if (!venue) return false

    return venue.address.toLowerCase().includes(city.toLowerCase())
}

export function useFetchFilteredListings() {
    const {isSuccess: isListingsFetchSuccess, data} = useFetchListings();
    const {isSuccess: isVenueFetchSuccess, data: venues} = useFetchVenues()
    const filters = useFiltersStore(s => s.filters)
    const searchString = useFiltersStore(s => s.searchString)?.toLowerCase() ?? ""

    const activeFilters = {searchString, date: filters.date, city: filters.city}

    // Both branches carry the same keys, so callers can read listingsToShow and filters
    // without narrowing on status first.
    if (!isListingsFetchSuccess || !isVenueFetchSuccess) {
        return {status: 'pending', listingsToShow: EMPTY_LISTINGS, filters: activeFilters} as const
    }

    // Each criterion is applied independently, so a link carrying both ?city= and ?date=
    // narrows by both instead of silently ignoring one of them.
    const listingsToShow = data.listings
        .filter(l => matchesSearch(l, searchString))
        .filter(l => matchesDate(l, filters.date))
        .filter(l => matchesCity(l, filters.city, venues.venues))

    return {status: 'success', listingsToShow, filters: activeFilters} as const
}