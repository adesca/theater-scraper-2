import {type Listing, useFetchListings} from "./useFetchListings.tsx";
import {useFetchVenues} from "./sidePanel/CityFilter.tsx";
import {useFiltersStore} from "./filtersStore.ts";

export function Listings() {
    const filters = useFiltersStore(s => s.filters)
    const res = useFetchListings();
    const {isSuccess: isVenueFetchSuccess, data: venues} = useFetchVenues()

    if (res.isSuccess && isVenueFetchSuccess) {
        const listingsToShow = res.data.listings
            .filter(l => {
                if (filters.date) {
                    switch (filters.date) {
                        case "starts this month":
                            return new Date(l.startDate).getMonth() === new Date().getMonth();
                        case 'ends this month':
                            return new Date(l.endDate).getMonth() === new Date().getMonth();
                        default:
                            // default case is when a month name is selected
                            return new Date(l.startDate).getMonth() === filters.date || new Date(l.endDate).getMonth() === filters.date
                    }
                } else if (filters.city) {
                    const venuesMatchingCompany =  venues.venues.filter(v => v.theaterName.toLowerCase().trim() === l.company.toLowerCase().trim())
                    if (venuesMatchingCompany[0]) {
                        return venuesMatchingCompany[0].address.toLowerCase().includes(filters.city.toLowerCase())
                    } else {
                        return false;
                    }
                }

                return true;
            })
        return <span>
            <div className="flex flex-wrap items-end">
                <span className="mr-auto">
                     {listingsToShow.length} / {res.data.listings.length} show listings
                </span>
            </div>

            <div className={'flex flex-wrap'}>
                {listingsToShow.map(l => <Listing key={`${l.name}-${l.company}`} {...l} />)}
            </div>
        </span>
    } else {
        return <span>
            <div>- / -- show listings</div>

            <div className={'flex flex-wrap'}>
                <div className={'flex m-3'}>
                    <div className={'skeleton h-32 w-32'} />
                    <div className={'flex flex-col pl-2 pt-8'}>
                        <div className={'skeleton h-4 w-60'} />
                        <div className={'skeleton h-4 w-32 mt-4'} />
                        <div className={'skeleton h-4 w-32 mt-4'} />
                    </div>
                </div>

                <div className={'flex m-3'}>
                    <div className={'skeleton h-32 w-32'} />
                    <div className={'flex flex-col pl-2 pt-8'}>
                        <div className={'skeleton h-4 w-60'} />
                        <div className={'skeleton h-4 w-32 mt-4'} />
                        <div className={'skeleton h-4 w-32 mt-4'} />
                    </div>
                </div>

                <div className={'flex m-3'}>
                    <div className={'skeleton h-32 w-32'} />
                    <div className={'flex flex-col pl-2 pt-8'}>
                        <div className={'skeleton h-4 w-60'} />
                        <div className={'skeleton h-4 w-32 mt-4'} />
                        <div className={'skeleton h-4 w-32 mt-4'} />
                    </div>
                </div>
            </div>
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

