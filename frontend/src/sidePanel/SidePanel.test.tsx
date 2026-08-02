import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {SidePanel} from "./SidePanel.tsx";
import {makeListing, makeVenue, mockApi, renderWithClient} from "../test/testUtils.tsx";
import {useFiltersStore} from "../filtersStore.ts";

const VENUES = [
    makeVenue({theaterName: "Dallas Rep", address: "100 Elm St, Dallas, TX 75201"}),
];

// Mid-August so the month button under test is "August" whichever timezone getMonth() runs
// in, and so SidePanel's renderedMonths filter keeps August in the list.
const LISTINGS = [
    makeListing({
        name: "Dallas Show", company: "Dallas Rep",
        startDate: "2026-08-10", endDate: "2026-08-20",
    }),
];

const AUGUST = 7;

beforeEach(() => {
    window.history.replaceState(null, "", "/");
    useFiltersStore.setState({filters: {}, searchString: ""});
});

afterEach(() => {
    vi.unstubAllGlobals();
    window.history.replaceState(null, "", "/");
    useFiltersStore.setState({filters: {}, searchString: ""});
});

function clearAllButton() {
    return screen.getByRole("button", {name: "Clear all"}) as HTMLButtonElement;
}

/** Renders the panel and waits for the city list, which needs both queries to resolve. */
async function renderPanel() {
    mockApi({venues: VENUES, listings: LISTINGS});

    const user = userEvent.setup();
    renderWithClient(<SidePanel/>);

    // The only city with a show, so the only item the listbox renders.
    const dallas = await screen.findByText("Dallas");

    return {user, dallas};
}

describe("SidePanel with several criteria selected", () => {
    it("keeps a date and a city selected at the same time", async () => {
        const {user, dallas} = await renderPanel();

        await user.click(screen.getByRole("button", {name: "Starts this month"}));
        await user.click(dallas);

        expect(useFiltersStore.getState().filters).toEqual({
            date: "starts this month",
            city: "Dallas",
        });

        // Both criteria also have to survive the round trip through the URL, since that is
        // what a shared link replays.
        expect(window.location.search).toBe("?city=Dallas&date=starts+this+month");
    });

    it("marks both the date button and the city as selected", async () => {
        const {user, dallas} = await renderPanel();

        await user.click(screen.getByRole("button", {name: "Starts this month"}));
        await user.click(dallas);

        // btn-neutral is the selected styling in both controls; btn-outline is unselected.
        expect(screen.getByRole("button", {name: "Starts this month"}).className)
            .toContain("btn-neutral");
        expect(screen.getByText("Dallas").className).toContain("btn-neutral");
    });

    it("adds a month filter without dropping the selected city", async () => {
        const {user, dallas} = await renderPanel();

        await user.click(dallas);
        await user.click(screen.getByRole("button", {name: "August"}));

        expect(useFiltersStore.getState().filters).toEqual({city: "Dallas", date: AUGUST});
    });

    it("swaps one date criterion for another without touching the city", async () => {
        const {user, dallas} = await renderPanel();

        await user.click(dallas);
        await user.click(screen.getByRole("button", {name: "Starts this month"}));
        await user.click(screen.getByRole("button", {name: "Ends this month"}));

        expect(useFiltersStore.getState().filters).toEqual({
            city: "Dallas",
            date: "ends this month",
        });
    });

    it("deselects only the date when its button is clicked again", async () => {
        const {user, dallas} = await renderPanel();

        await user.click(screen.getByRole("button", {name: "Starts this month"}));
        await user.click(dallas);
        await user.click(screen.getByRole("button", {name: "Starts this month"}));

        expect(useFiltersStore.getState().filters).toEqual({city: "Dallas"});
        expect(window.location.search).toBe("?city=Dallas");

        expect(screen.getByRole("button", {name: "Starts this month"}).className)
            .toContain("btn-outline");
        expect(screen.getByText("Dallas").className).toContain("btn-neutral");
    });
});

describe("SidePanel clear-all button", () => {
    it("is disabled while nothing is selected", async () => {
        await renderPanel();

        expect(clearAllButton().disabled).toBe(true);
    });

    it("becomes enabled once a criterion is selected", async () => {
        const {user, dallas} = await renderPanel();

        await user.click(dallas);

        expect(clearAllButton().disabled).toBe(false);
    });

    it("is enabled for a January filter, which is month index 0", async () => {
        await renderPanel();

        useFiltersStore.setState({filters: {date: 0}});

        await waitFor(() => {
            expect(clearAllButton().disabled).toBe(false);
        })
    });

    it("clears every selected criterion at once", async () => {
        const {user, dallas} = await renderPanel();

        await user.click(screen.getByRole("button", {name: "Starts this month"}));
        await user.click(dallas);
        await user.type(screen.getByPlaceholderText("Show titles / theatres"), "rocky");

        await user.click(clearAllButton());

        expect(useFiltersStore.getState().filters).toEqual({});
        expect(useFiltersStore.getState().searchString).toBe("");

        // Nothing left for a shared link to replay.
        expect(window.location.search).toBe("");
    });

    it("resets the controls it cleared", async () => {
        const {user, dallas} = await renderPanel();

        await user.click(screen.getByRole("button", {name: "Starts this month"}));
        await user.click(dallas);
        await user.type(screen.getByPlaceholderText("Show titles / theatres"), "rocky");

        await user.click(clearAllButton());

        expect(screen.getByRole("button", {name: "Starts this month"}).className)
            .toContain("btn-outline");
        expect(screen.getByText("Dallas").className).not.toContain("btn-neutral");

        // The search box is controlled, so clearing the store empties the visible text too.
        expect((screen.getByPlaceholderText("Show titles / theatres") as HTMLInputElement).value)
            .toBe("");

        expect(clearAllButton().disabled).toBe(true);
    });
});

