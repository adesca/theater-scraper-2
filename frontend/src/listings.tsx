import type {Filters} from "./models.ts";
import {type Listing, useFetchListings} from "./useFetchListings.tsx";

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
        return <span>
            <div>{listingsToShow.length} / {res.data.listings.length} show listings</div>
            <div className={'flex flex-wrap'}>
                {listingsToShow.map(l => <Listing key={`${l.name}-${l.company}`} {...l} />)}
            </div>
        </span>
    } else {
        return <span>
            <div>- / -- show listings</div>
            <span className="loading loading-bars loading-lg"></span>
        </span>
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

