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

// August is month index 7; December is 11. Mid-month days so a UTC-parsed date cannot slip
// into the neighbouring month once getMonth() reads it in the local timezone.
const AUGUST = {startDate: "2026-08-10", endDate: "2026-08-20"};
const DECEMBER = {startDate: "2026-12-10", endDate: "2026-12-20"};

const DATED_LISTINGS = [
    makeListing({name: "Dallas August Show", company: "Dallas Rep", source: "breaklegs", id: "dallas-aug", ...AUGUST}),
    makeListing({name: "Dallas December Show", company: "Dallas Rep", source: "breaklegs", id: "dallas-dec", ...DECEMBER}),
    makeListing({name: "Plano August Show", company: "Plano Rep", source: "breaklegs", id: "plano-aug", ...AUGUST}),
];

beforeEach(() => {
    window.history.replaceState(null, "", "/");
    useFiltersStore.setState({filters: {}});
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
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

describe("Listings combined filters", () => {
    it("narrows by a city and a date filter at the same time", async () => {
        mockApi({venues: VENUES, listings: DATED_LISTINGS});
        useFiltersStore.setState({filters: {city: "Dallas", date: 7}});

        const {container} = renderWithClient(<Listings/>);

        expect(await screen.findByText("Dallas August Show")).toBeTruthy();

        // Excluded by the date criterion.
        expect(screen.queryByText("Dallas December Show")).toBeNull();

        // Excluded by the city criterion -- the one the old else-if chain skipped whenever
        // a date filter was set too, which made a ?city=&date= link behave differently
        // from clicking the same two filters.
        expect(screen.queryByText("Plano August Show")).toBeNull();

        expect(normText(container)).toContain("1 / 3 show listings");
    });

    it("still applies a lone date filter to every venue", async () => {
        mockApi({venues: VENUES, listings: DATED_LISTINGS});
        useFiltersStore.setState({filters: {date: 7}});

        const {container} = renderWithClient(<Listings/>);

        expect(await screen.findByText("Dallas August Show")).toBeTruthy();
        expect(screen.getByText("Plano August Show")).toBeTruthy();
        expect(screen.queryByText("Dallas December Show")).toBeNull();

        expect(normText(container)).toContain("2 / 3 show listings");
    });

    it("treats January as a real month rather than an absent filter", async () => {
        const january = makeListing({
            name: "January Show", company: "Dallas Rep", source: "breaklegs", id: "jan",
            startDate: "2026-01-10", endDate: "2026-01-20",
        });

        mockApi({venues: VENUES, listings: [january, ...DATED_LISTINGS]});
        useFiltersStore.setState({filters: {date: 0}});

        const {container} = renderWithClient(<Listings/>);

        expect(await screen.findByText("January Show")).toBeTruthy();
        expect(screen.queryByText("Dallas August Show")).toBeNull();

        expect(normText(container)).toContain("1 / 4 show listings");
    });
});

describe("Listings with duplicate source ids", () => {
    // Two BreakLegs ids for the same show at the same theater: identical name and company,
    // so keying the cards on those two fields collapsed the pair into a single rendered card.
    const twoRuns = [
        makeListing({name: "Dallas Show", company: "Dallas Rep", source: "breaklegs", id: "run-one", ...AUGUST}),
        makeListing({name: "Dallas Show", company: "Dallas Rep", source: "breaklegs", id: "run-two", ...DECEMBER}),
    ];

    it("renders a card per listing", async () => {
        mockApi({venues: VENUES, listings: twoRuns});

        const {container} = renderWithClient(<Listings/>);

        expect(await screen.findAllByText("Dallas Show")).toHaveLength(2);
        expect(normText(container)).toContain("2 / 2 show listings");
    });

    it("does not warn about duplicate keys", async () => {
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
        mockApi({venues: VENUES, listings: twoRuns});

        renderWithClient(<Listings/>);
        await screen.findAllByText("Dallas Show");

        expect(consoleError.mock.calls.flat().join(" ")).not.toContain("same key");
    });
});
