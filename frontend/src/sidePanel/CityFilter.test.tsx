import {afterEach, describe, expect, it, vi} from "vitest";
import {screen} from "@testing-library/react";
import {CityFilter} from "./CityFilter.tsx";
import {makeListing, makeVenue, mockApi, renderWithClient} from "../test/testUtils.tsx";

// Venues in three cities across two regions. Addresses are chosen so no city name is an
// accidental substring of another address (which would inflate the region counts).
const VENUES = [
    makeVenue({theaterName: "Dallas Rep", address: "100 Elm St, Dallas, TX 75201"}),
    makeVenue({theaterName: "Plano Rep", address: "200 K Ave, Plano, TX 75074"}),
    makeVenue({theaterName: "Allen Stage", address: "300 Century Pkwy, Allen, TX 75002"}),
];

const LISTINGS = [
    makeListing({name: "Show A", company: "Dallas Rep"}),
    makeListing({name: "Show B", company: "Plano Rep"}),
    makeListing({name: "Show C", company: "Allen Stage"}),
];

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("CityFilter region counts", () => {
    it("shows the number of cities with shows next to each region name", async () => {
        mockApi({venues: VENUES, listings: LISTINGS});

        renderWithClient(<CityFilter onSelect={vi.fn()} selectedCity={""}/>);

        // North Dallas has one matching city (Dallas); Collin County has two (Plano, Allen).
        expect(await screen.findByText("North Dallas (1)")).toBeTruthy();
        expect(screen.getByText("Collin County (2)")).toBeTruthy();
    });

    it("omits regions that have no cities with shows", async () => {
        mockApi({venues: VENUES, listings: LISTINGS});

        renderWithClient(<CityFilter onSelect={vi.fn()} selectedCity={""}/>);

        // Wait for the populated list, then confirm an unrelated region never renders.
        await screen.findByText("North Dallas (1)");
        expect(screen.queryByText(/^Fort Worth \(/)).toBeNull();
    });
});
