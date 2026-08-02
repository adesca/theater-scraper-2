import './App.css'
import {SidePanel} from "./sidePanel/SidePanel.tsx";
import {Listings} from "./listings.tsx";
import {Bomb, CircleX, Menu} from "lucide-react";
import {useFiltersStore} from "./filtersStore.ts";
import {months} from "./models.ts";
import {useState} from "react";

function App() {
    return <div className="drawer lg:drawer-open">
        <input id="drawer-toggle" type="checkbox" className="drawer-toggle"/>
        <div className="drawer-content flex flex-col">
            <SelectedFilterPills/>

            <main>
                <Listings/>
            </main>

        </div>
        <div className="drawer-side">
            <label htmlFor="drawer-toggle" aria-label="close sidebar" className="drawer-overlay"></label>
            <aside className="bg-base-200 w-80 p-4 min-h-full">
                <SidePanel/>
            </aside>
        </div>
    </div>
}

function SelectedFilterPills() {
    const filters = useFiltersStore(s => s.filters);
    const searchString = useFiltersStore(s => s.searchString)?.toLowerCase() ?? ""
    const selectFilter = useFiltersStore(s => s.selectFilter)
    const filterByString = useFiltersStore(s => s.searchFilter)
    const clearFilters = useFiltersStore(s => s.clearFilters)


    let DatePill = <></>
    if (filters.date !== undefined) {
        const date = filters.date
        if (typeof date === 'number') {
            DatePill = <FilterPill text={months[date]} onClose={() => selectFilter('date', date)} />
        } else {
            DatePill = <FilterPill text={"" +date} onClose={() => selectFilter('date', date)} />
        }
    }

    const city = filters.city;
    const CityPill = city !== undefined ? <FilterPill text={city} onClose={() => selectFilter('city', city)} /> : <></>
    const SearchStringPill = searchString ? <FilterPill text={searchString} onClose={() => filterByString("")} /> : <></>

    const hasFilters = !!(filters.date || filters.city || searchString)

    return <div className={'flex flex-row mx-2 justify-between items-center lg:hidden'}>
        <label htmlFor="drawer-toggle" className="btn drawer-button lg:hidden self-start m-2">
            <Menu/>
        </label>
        <div className={'[&>*]:my-1 [&>*]:mx-1'}>
            {DatePill}
            {CityPill}
            {SearchStringPill}

            {hasFilters && <div onClick={clearFilters} className="badge badge-ghost badge-lg cursor-pointer">Clear filters <Bomb /></div>}
        </div>
    </div>
}

function FilterPill(props: { text: string; onClose: (text: string) => void }) {
    const [closing, setClosing] = useState(false);

    return (
        <div
            className={`
                badge badge-neutral badge-lg capitalize cursor-pointer
                transition-all duration-200 ease-out
                ${closing
                ? "opacity-0 scale-90 -translate-y-1"
                : "opacity-100 scale-100 translate-y-0"}
            `}
            onClick={() => {
                setClosing(true);
                setTimeout(() => props.onClose(props.text), 200);
            }}
        >
            {props.text}
            <CircleX />
        </div>
    );
}

export default App
