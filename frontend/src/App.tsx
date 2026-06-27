import './App.css'
import {SidePanel} from "./SidePanel.tsx";
import {useState} from "react";
import type {Filters} from "./models.ts";
import {Listings} from "./listings.tsx";



function App() {
    const [displayedPerformancesFilters, setFilters] = useState<Partial<Filters> | null>();

  return (
      <div className="drawer drawer-open">
          <input id="my-drawer-3" type="checkbox" className="drawer-toggle" />
          <div className="drawer-content flex flex-col items-center justify-center">

              <label htmlFor="my-drawer-3" className="btn drawer-button lg:hidden">
                  Filters
              </label>

              <Listings />
          </div>
          <div className="drawer-side">
              <label htmlFor="my-drawer-3" aria-label="close sidebar" className="drawer-overlay"></label>
              <SidePanel onFilterChange={setFilters} />
          </div>
      </div>
  )
}

export default App
