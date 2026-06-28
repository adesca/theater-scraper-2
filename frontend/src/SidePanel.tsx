import {type Filters, months} from "./models.ts";
import {useState} from "react";

interface Props {
    onFilterChange: (input: Filters) => void;
}


export function SidePanel(props: Props) {
    const [selectedFilter, setSelectedFilter] = useState<string | number>("")

    function selectFilter<T extends keyof Filters>(filterType: NonNullable<T>, value: NonNullable<Filters[T]>) {
        const filterChangeInput: Filters = {}
        filterChangeInput[filterType] = value;
        props.onFilterChange(filterChangeInput)
        setSelectedFilter(value);
    }

    return <span className={'prose'}>
        <h2>Filters</h2>
        <h3>Date</h3>
        <button className={`btn btn-sm m-2 ${selectedFilter === 'starts this month' ? "btn-neutral" : "btn-outline"}`} onClick={() => selectFilter('date', 'starts this month')}>Starts this month</button>
        <button className={`btn btn-sm m-2 ${selectedFilter === 'ends this month' ? "btn-neutral" : "btn-outline"}`} onClick={() => selectFilter('date', 'ends this month')}>Ends this month</button>
        <div>
            {months.map((m, idx) => <button key={m} disabled={new Date().getMonth() > idx} className={`btn btn-sm m-2  ${selectedFilter === idx ? "btn-neutral" : "btn-outline"}`} onClick={() => selectFilter('date', idx)}>{m}</button>)}
        </div>
    </span>
}