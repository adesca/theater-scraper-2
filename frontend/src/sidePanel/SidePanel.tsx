import {months} from "../models.ts";
import {CityFilter} from "./CityFilter.tsx";
import {useFiltersStore} from "../filtersStore.ts";
import {useFetchListings} from "../useFetchListings.tsx";

export function SidePanel() {
    const filters = useFiltersStore(s => s.filters)
    const selectFilter = useFiltersStore(s => s.selectFilter)
    const {isSuccess: isShowsFetched, data: shows} = useFetchListings();
    let renderedMonths = [...months];
    if (isShowsFetched) {
        renderedMonths = renderedMonths.filter((_, monthIdx) => {
            return shows.listings.some(l => new Date(l.startDate).getMonth() === monthIdx || new Date(l.endDate).getMonth() === monthIdx)
        })

    }



    return <span className={'prose'}>
        <h2 className={'mr-auto'}>Filters</h2>

        <h3>Date</h3>
        <button className={`btn btn-sm m-2 ${filters.date === 'starts this month' ? "btn-neutral" : "btn-outline"}`}
                onClick={() => selectFilter('date', 'starts this month')}>Starts this month</button>
        <button className={`btn btn-sm m-2 ${filters.date === 'ends this month' ? "btn-neutral" : "btn-outline"}`}
                onClick={() => selectFilter('date', 'ends this month')}>Ends this month</button>
        <div>
            {renderedMonths
                .map((m) => <button key={m}
                                            className={`btn btn-sm m-2  ${filters.date === months.indexOf(m) ? "btn-neutral" : "btn-outline"}`}
                                            onClick={() => selectFilter('date', months.indexOf(m))}>{m} {months.indexOf(m) < new Date().getMonth() -2 ? "(2027)" : ""}</button>)}
        </div>

        <div className="divider w-5/6 mx-auto"></div>
        <CityFilter onSelect={(selectedCity) => selectFilter('city', selectedCity)} selectedCity={filters.city ?? ''} />
         <div className="divider w-5/6 mx-auto"></div>
    </span>
}
