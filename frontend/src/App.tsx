import './App.css'
import {SidePanel} from "./sidePanel/SidePanel.tsx";
import {Listings} from "./listings.tsx";

function App() {
    return <div className="grid md:grid-cols-[20rem_1fr] gap-6">
        <aside className="bg-base-200">
            <SidePanel/>
        </aside>

        <main>
            <Listings/>
        </main>
    </div>
}

export default App
