import {useQuery} from "@tanstack/react-query";
import type {Venue} from "../../../models";
import {useFetchListings} from "../useFetchListings.tsx";
import {ListboxSelect} from "../components/ListboxSelect.tsx";

interface Props {
    onSelect: (city: string) => void
    selectedCity: string
}

export function CityFilter(props: Props) {
    const {isSuccess, data: venues} = useFetchVenues()
    const {isSuccess: isShowsFetched, data: shows} = useFetchListings();

    if (!isSuccess || !isShowsFetched) {
        return <></>
    }

    const allShowAddresses = shows.listings.map(l => l.company.trim().toLowerCase())
        .map(company => venues.venues.find(v => v.theaterName.toLowerCase() === company))
        .filter(venue => !!venue)
        .map(v => v.address);

    const multiSelectItems = Object.entries(CITIES_GROUPED)
        .flatMap(([group, cities]) => {
            return cities.map(c => ({label: c, value: c, group}))
        })
        .filter(c => {
            return allShowAddresses.some(a => a.toLowerCase().includes(c.label.toLowerCase()))
        })
    return <ListboxSelect items={multiSelectItems} label={'Cities'} placeholder={"e.g. Dallas"}
                          onSelect={props.onSelect} selected={props.selectedCity}/>

}

export function useFetchVenues() {
    return useQuery({
        queryKey: ['venues'],
        queryFn: () =>
            fetch(`${import.meta.env.VITE_API_URL}/venues`)
                .then((res) => res.json() as Promise<{
                    venues: Venue[]
                }>)
    })
}


const CITIES_GROUPED = {
    "Nomadic": ["Nomadic"],
    "North Dallas": [
        "Dallas",
        "Richardson",
        "Addison",
        "Farmers Branch"
    ],
    "Collin County": [
        "Plano",
        "Allen",
        "Frisco",
        "Wylie",
        "Weston"
    ],
    "Denton / Lewisville": [
        "Lewisville",
        "The Colony",
        "Coppell",
        "Highland Village",
        "Denton",
        "Pilot Point"
    ],
    "Northeast Dallas": [
        "Garland",
        "Mesquite",
        "Rockwall",
        "Greenville"
    ],
    "Mid-Cities": [
        "Irving",
        "Grapevine",
        "Euless",
        "Bedford",
        "Hurst",
        "North Richland Hills"
    ],
    "Fort Worth": [
        "Fort Worth",
        "Keller",
        "Arlington",
        "Grand Prairie",
        "Mansfield"
    ],
    "West DFW": [
        "Aledo",
        "Weatherford",
        "Azle",
        "Bridgeport",
        "Granbury"
    ],
    "South DFW": [
        "Duncanville",
        "Cedar Hill",
        "Midlothian",
        "Waxahachie",
        "Ennis",
        "Cleburne"
    ],
    "Outside Metroplex": [
        "Gainesville",
        "Sherman",
        "Sulphur Springs",
        "Athens"
    ]
}