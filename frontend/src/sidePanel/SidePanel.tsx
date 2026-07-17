import {months} from "../models.ts";
import {VersionInfoComponent} from "./VersionInfoComponent.tsx";
import {CityFilter} from "./CityFilter.tsx";
import {useFiltersStore} from "../filtersStore.ts";

export function SidePanel() {
    const filters = useFiltersStore(s => s.filters)
    const selectFilter = useFiltersStore(s => s.selectFilter)

    return <span className={'prose'}>
        <h2 className={'mr-auto'}>Filters</h2>

        <h3>Date</h3>
        <button className={`btn btn-sm m-2 ${filters.date === 'starts this month' ? "btn-neutral" : "btn-outline"}`}
                onClick={() => selectFilter('date', 'starts this month')}>Starts this month</button>
        <button className={`btn btn-sm m-2 ${filters.date === 'ends this month' ? "btn-neutral" : "btn-outline"}`}
                onClick={() => selectFilter('date', 'ends this month')}>Ends this month</button>
        <div>
            {months
                .filter((_, idx) => new Date().getMonth() < idx)
                .map((m, idx) => <button key={m}
                                            className={`btn btn-sm m-2  ${filters.date === idx ? "btn-neutral" : "btn-outline"}`}
                                            onClick={() => selectFilter('date', idx)}>{m}</button>)}
        </div>

        <div className="divider w-5/6 mx-auto"></div>
        <CityFilter onSelect={(selectedCity) => selectFilter('city', selectedCity)} selectedCity={filters.city ?? ''} />
         <div className="divider w-5/6 mx-auto"></div>

        <VersionInfoComponent/>
    </span>
}
