import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {screen} from "@testing-library/react";
import {Listings} from "./listings.tsx";
import {makeListing, makeVenue, mockApi, normText, renderWithClient} from "./test/testUtils.tsx";
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

describe("Listings city filter", () => {
    it("only renders listings whose venue is in the selected city", async () => {
        mockApi({venues: VENUES, listings: LISTINGS});
        useFiltersStore.setState({filters: {city: "Dallas"}});

        renderWithClient(<Listings/>);

        // The Dallas listing is shown; the Plano listing is filtered out.
        expect(await screen.findByText("Dallas Show")).toBeTruthy();
        expect(screen.queryByText("Plano Show")).toBeNull();
    });

    it("reports the shown-vs-total count for the selected city", async () => {
        mockApi({venues: VENUES, listings: LISTINGS});
        useFiltersStore.setState({filters: {city: "Dallas"}});

        const {container} = renderWithClient(<Listings/>);

        // Counter text ("1 / 2 show listings") is split across JSX text nodes, so match the
        // normalized textContent of the container instead of a single text node.
        await screen.findByText("Dallas Show");
        expect(normText(container)).toContain("1 / 2 show listings");
    });
});
