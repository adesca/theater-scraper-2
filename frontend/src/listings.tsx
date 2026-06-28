import type {Filters} from "./models.ts";
import {useQuery} from "@tanstack/react-query";

interface Props {
    filters: Filters
}

export function Listings(props: Props) {
    const res = useFetchListings();
    if (res.isSuccess) {
        const listingsToShow = res.data.listings
            .filter(l => {
                if (props.filters.date) {
                    switch (props.filters.date) {
                        case "starts this month":
                            return new Date(l.startDate).getMonth() === new Date().getMonth();
                        case 'ends this month':
                            return new Date(l.endDate).getMonth() === new Date().getMonth();
                        default:
                            // default case is when a month name is selected
                            return new Date(l.startDate).getMonth() === props.filters.date || new Date(l.endDate).getMonth() === props.filters.date
                    }
                }

                return true;
            })
        return <span className={'flex flex-wrap'}>
            <div>Showing {listingsToShow.length} of {res.data.listings.length} show listings</div>
            {listingsToShow.map(l => <Listing key={`${l.name}-${l.company}`} {...l} />)}
        </span>
    } else {
        return <></>
    }
}

function Listing(props: Listing) {
    const firstDate = new Intl.DateTimeFormat(undefined, {
        month: "long",
        day: "numeric"
    }).format(new Date(props.startDate));
    const secondDate = props.endDate ? new Intl.DateTimeFormat(undefined, {
        month: "long",
        day: "numeric"
    }).format(new Date(props.endDate)) : null
    const dateStr = `${firstDate}${secondDate ? ` - ${secondDate}` : ""}`

    return <div className="card card-sm card-side bg-base-300 w-96 shadow-md py-2 m-2">
        <figure className={'w-32 shrink-0'}>
            {props.imageUrl && <img className={'w-full h-auto object-contain'} src={props.imageUrl} alt={props.name}/>}
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
    endDate: string
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