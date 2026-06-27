import type {Filters} from "./models.ts";
import {useQuery} from "@tanstack/react-query";

interface Props {
    filters: Filters
}

export function Listings() {
    const res = useFetchListings();
    if (res.isSuccess) {
        console.log(res.data)
        return <>
            {res.data.listings.map(l => l.name)}
        </>
    } else {
        return <></>
    }
}

interface Listing {
    name: string,
    company: string,
    startDate: Date,
    endDate: Date | null
}

function useFetchListings() {
    return useQuery({
        queryKey: ['listings'],
        queryFn: () =>
            fetch('http://localhost:3000/performances')
                .then((res) => res.json() as Promise<{
                    listings: Listing[]
                }>)
    })
}