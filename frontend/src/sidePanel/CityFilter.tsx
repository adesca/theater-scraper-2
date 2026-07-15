import {useQuery} from "@tanstack/react-query";
import type { Venue } from "../../../models";
import {useFetchListings} from "../useFetchListings.tsx";
import {Multiselect} from "../components/Multiselect.tsx";

export function CityFilter() {
    const {isSuccess, data} = useFetchVenues()
    const {isSuccess: isShowsFetched, data: shows} = useFetchListings();

    if(!isSuccess || !isShowsFetched) {
        return <></>
    }

    const allShowTheaters = shows.listings.map(l => l.company.trim().toLowerCase());

    const multiSelectItems = Object.entries(CITIES_GROUPED).flatMap(([group, cities]) => {
        return cities.map(c => ({label: c, value: c, group}))
    })
    return <Multiselect items={multiSelectItems} label={'Cities'} placeholder={"e.g. Dallas"} />

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

const ALL_CITIES = new Set([
    "Richardson",
    "Allen",
    "Weston",
    "Plano",
    "Dallas",
    "Azle",
    "Midlothian",
    "Bridgeport",
    "Gainesville",
    "Cleburne",
    "Sulphur Springs",
    "Duncanville",
    "Ennis",
    "Farmers Branch",
    "Mansfield",
    "Garland",
    "Granbury",
    "Grand Prairie",
    "Greenville",
    "Irving",
    "Keller",
    "The Colony",
    "Lewisville",
    "Cedar Hill",
    "Addison",
    "Mesquite",
    "North Richland Hills",
    "Bedford",
    "Aledo",
    "Rockwall",
    "Grapevine",
    "Weatherford",
    "Sherman",
    "Athens",
    "Fort Worth",
    "Pilot Point",
    "Highland Village",
    "Denton",
    "Hurst",
    "Arlington",
    "Coppell",
    "Frisco",
    "Euless",
    "Waxahachie",
    "Wylie",
    "Nomadic"
])

const CITIES_GROUPED = {
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