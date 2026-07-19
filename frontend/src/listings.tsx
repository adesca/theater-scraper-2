import {useFetchListings} from "./useFetchListings.tsx";
import {useFetchVenues} from "./sidePanel/CityFilter.tsx";
import {useFiltersStore} from "./filtersStore.ts";
import type {Listing} from "../../models";
import {VersionInfoComponent} from "./components/VersionInfoComponent.tsx";


export function Listings() {
    const filters = useFiltersStore(s => s.filters)
    const res = useFetchListings();
    const {isSuccess: isVenueFetchSuccess, data: venues} = useFetchVenues()

    if (res.isSuccess && isVenueFetchSuccess) {
        const listingsToShow = res.data.listings
            .filter(l => {
                console.log('hit')
                if (!isNaN(filters.date as number) || filters.date === 'ends this month' || filters.date === 'starts this month') {
                    console.log('hi2')
                    switch (filters.date) {
                        case "starts this month":
                            return new Date(l.startDate).getMonth() === new Date().getMonth();
                        case 'ends this month':
                            return new Date(l.endDate).getMonth() === new Date().getMonth();
                        default:
                            // default case is when a month name is selected
                            console.log('fasd', filters.date)
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
                <VersionInfoComponent />
            </div>

            <div className={'flex flex-wrap'}>
                {listingsToShow
                    .sort((a,b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                    .map(l => <Listing key={`${l.name}-${l.company}`} {...l} />)
                }
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
            {props.imageUrl && <img className={'w-full h-auto object-contain'} src={props.imageUrl} alt={props.name}
                                    loading={"lazy"} decoding={"async"} referrerPolicy={"no-referrer"}
            />}
        </figure>
        <div className="card-body">
            <h2><a className={'card-title'} href={props.listingUrl} target={'_blank'}>{props.name} <ExternalLinkSvg /></a></h2>
            <div>{dateStr}</div>
            <p>{props.company}</p>
        </div>
    </div>
}

function ExternalLinkSvg() {
    return <svg className={'w-4'} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
        <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
        <g id="SVGRepo_iconCarrier"> <g id="Interface / External_Link"> <path id="Vector" d="M10.0002 5H8.2002C7.08009 5 6.51962 5 6.0918 5.21799C5.71547 5.40973 5.40973 5.71547 5.21799 6.0918C5 6.51962 5 7.08009 5 8.2002V15.8002C5 16.9203 5 17.4801 5.21799 17.9079C5.40973 18.2842 5.71547 18.5905 6.0918 18.7822C6.5192 19 7.07899 19 8.19691 19H15.8031C16.921 19 17.48 19 17.9074 18.7822C18.2837 18.5905 18.5905 18.2839 18.7822 17.9076C19 17.4802 19 16.921 19 15.8031V14M20 9V4M20 4H15M20 4L13 11" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path> </g> </g></svg>
}