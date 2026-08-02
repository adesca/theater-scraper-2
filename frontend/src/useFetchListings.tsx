import {useQuery} from "@tanstack/react-query";
import type {Listing, Venue} from "../../models";
import {trackAction} from "./trackAction.tsx";
import {useFetchVenues} from "./sidePanel/CityFilter.tsx";
import {useFiltersStore} from "./filtersStore.ts";
import type {Filters} from "./models.ts";

const HALF_DAY = 1000 * 60 * 60 * 12;

export function useFetchListings() {
    const track = trackAction();

    return useQuery({
        queryKey: ['listings'],
        staleTime: HALF_DAY, gcTime: HALF_DAY * 2,
        refetchOnWindowFocus: false,
        queryFn: async () => {
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/performances`
            );

            const data = await response.json() as {
                listings: Listing[];
            };

            track("performances_loaded", {
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

    if (isListingsFetchSuccess && isVenueFetchSuccess) {
        // Each criterion is applied independently, so a link carrying both ?city= and ?date=
        // narrows by both instead of silently ignoring one of them.
        const listingsToShow = data.listings
            .filter(l => matchesSearch(l, searchString))
            .filter(l => matchesDate(l, filters.date))
            .filter(l => matchesCity(l, filters.city, venues.venues))

        return {status: 'success', listingsToShow, filters: {searchString, date: filters.date, city: filters.city}} as const
    }

    return {status: 'pending'} as const

}