import {useQuery} from "@tanstack/react-query";
import type {Listing} from "../../models";


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