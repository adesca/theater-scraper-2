import './App.css'
import {SidePanel} from "./sidePanel/SidePanel.tsx";
import {useState} from "react";
import type {Filters} from "./models.ts";
import {Listings} from "./listings.tsx";



function App() {
    const [displayedPerformancesFilters, setFilters] = useState<Partial<Filters>>({});

    return <div className="grid md:grid-cols-[20rem_1fr] gap-6">
        <aside className="bg-base-200">
            <SidePanel onFilterChange={setFilters}/>
        </aside>

        <main>
            <Listings filters={displayedPerformancesFilters} />
        </main>
    </div>
}

export default App
