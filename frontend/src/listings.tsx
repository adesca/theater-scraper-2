import type {Filters} from "./models.ts";
import {useQuery} from "@tanstack/react-query";

interface Props {
    filters: Filters
}

export function Listings() {
    const res = useFetchListings();
    if (res.isSuccess) {
        return <>
            {res.data.listings.map(l => <Listing {...l} />)}
        </>
    } else {
        return <></>
    }
}

function Listing(props: Listing) {
    const firstDate = new Intl.DateTimeFormat(undefined, {month: "long", day: "numeric"}).format(new Date(props.startDate));
    const secondDate = props.endDate ? new Intl.DateTimeFormat(undefined, {month: "long", day: "numeric"}).format(new Date(props.endDate)) : null
    const dateStr = `${firstDate}${secondDate ? `- ${secondDate}` : ""}`

    return <div className="card card-side bg-base-100 w-96 shadow-sm py-2 my-2">
        <figure>
            {props.imageUrl &&  <img src={props.imageUrl} alt={props.name} />}
        </figure>
        <div className="card-body">
            <h2 className="card-title">{props.name}</h2>
            <div>{dateStr}</div>
            <p>{props.company}</p>
        </div>
    </div>
}

interface Listing {
    name: string,
    company: string,
    startDate: string,
    endDate: string | null
    imageUrl: string | null
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