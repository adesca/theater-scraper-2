import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {screen} from "@testing-library/react";
import App from "./App.tsx";
import {makeListing, makeVenue, mockApi, renderWithClient} from "./test/testUtils.tsx";
import {useFiltersStore} from "./filtersStore.ts";

const VENUES = [
    makeVenue({theaterName: "Dallas Rep", address: "100 Elm St, Dallas, TX 75201"}),
    makeVenue({theaterName: "Plano Rep", address: "200 K Ave, Plano, TX 75074"}),
];

const LISTINGS = [
    makeListing({name: "Dallas Show", company: "Dallas Rep"}),
    makeListing({name: "Plano Show", company: "Plano Rep"}),
];

beforeEach(() => {
    window.history.replaceState(null, "", "/");
    useFiltersStore.setState({filters: {}});
});

afterEach(() => {
    vi.unstubAllGlobals();
    window.history.replaceState(null, "", "/");
    useFiltersStore.setState({filters: {}});
});

describe("App loads pre-filtered from a shared URL", () => {
    it("renders only the listings matching a city already present in the URL", async () => {
        mockApi({venues: VENUES, listings: LISTINGS});

        // Simulate opening the app with a shared link: the URL carries the filter before
        // anything renders, so we rehydrate the store from it exactly as page load would.
        window.history.pushState(null, "", "/?city=Dallas");
        await useFiltersStore.persist.rehydrate();

        renderWithClient(<App/>);

        expect(await screen.findByText("Dallas Show")).toBeTruthy();
        expect(screen.queryByText("Plano Show")).toBeNull();
    });
});
