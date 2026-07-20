import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    useFiltersStore.setState({filters: {}, searchString: ""});
});

afterEach(() => {
    vi.unstubAllGlobals();
    window.history.replaceState(null, "", "/");
    useFiltersStore.setState({filters: {}, searchString: ""});
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

describe("Search filters listings by title or company", () => {
    const SEARCH_LISTINGS = [
        makeListing({name: "The Rocky Horror Show", company: "Plano Rep"}),
        makeListing({name: "Cinderella", company: "Frisco Rep"}),
    ];

    it("narrows the list to shows whose title contains the typed substring", async () => {
        mockApi({venues: VENUES, listings: SEARCH_LISTINGS});
        const user = userEvent.setup();

        renderWithClient(<App/>);
        await screen.findByText("The Rocky Horror Show");

        // "rocky" is a substring of the show title "The Rocky Horror Show".
        await user.type(screen.getByPlaceholderText("Show titles / theatres"), "rocky");

        expect(screen.getByText("The Rocky Horror Show")).toBeTruthy();
        expect(screen.queryByText("Cinderella")).toBeNull();
    });

    it("narrows the list to shows whose company contains the typed substring", async () => {
        mockApi({venues: VENUES, listings: SEARCH_LISTINGS});
        const user = userEvent.setup();

        renderWithClient(<App/>);
        await screen.findByText("Cinderella");

        // "frisco" is a substring of the company name "Frisco Rep".
        await user.type(screen.getByPlaceholderText("Show titles / theatres"), "frisco");

        expect(screen.getByText("Cinderella")).toBeTruthy();
        expect(screen.queryByText("The Rocky Horror Show")).toBeNull();
    });

    it("matching is case-insensitive", async () => {
        mockApi({venues: VENUES, listings: SEARCH_LISTINGS});
        const user = userEvent.setup();

        renderWithClient(<App/>);
        await screen.findByText("The Rocky Horror Show");

        await user.type(screen.getByPlaceholderText("Show titles / theatres"), "ROCKY");

        expect(screen.getByText("The Rocky Horror Show")).toBeTruthy();
        expect(screen.queryByText("Cinderella")).toBeNull();
    });
});
