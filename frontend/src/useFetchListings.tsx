import {useQuery} from "@tanstack/react-query";

export interface Listing {
    name: string,
    company: string,
    startDate: string,
    endDate: string
    imageUrl: string | null
}

export function useFetchListings() {
    return useQuery({
        queryKey: ['listings'],
        queryFn: () =>
            fetch(`${import.meta.env.VITE_API_URL}/performances`)
                .then((res) => res.json() as Promise<{
                    listings: Listing[]
                }>)
    })
}