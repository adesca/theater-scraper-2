import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {SidePanel} from "./SidePanel.tsx";
import {makeListing, makeVenue, mockApi, renderWithClient} from "../test/testUtils.tsx";
import {useFiltersStore} from "../filtersStore.ts";

const VENUES = [
    makeVenue({theaterName: "Dallas Rep", address: "100 Elm St, Dallas, TX 75201"}),
];

const LISTINGS = [
    makeListing({name: "Dallas Show", company: "Dallas Rep"}),
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

describe("SidePanel date/city mutual exclusivity", () => {
    it("clears the active date filter when a city is selected", async () => {
        mockApi({venues: VENUES, listings: LISTINGS});
        const user = userEvent.setup();

        renderWithClient(<SidePanel/>);

        // Select a date filter.
        await user.click(screen.getByRole("button", {name: "Starts this month"}));
        expect(useFiltersStore.getState().filters).toEqual({date: "starts this month"});
        expect(screen.getByRole("button", {name: "Starts this month"}).className)
            .toContain("btn-neutral");

        // Selecting a city replaces the filter entirely (no date key) and deselects the date.
        await user.click(await screen.findByText("Dallas"));
        expect(useFiltersStore.getState().filters).toEqual({city: "Dallas"});
        expect(screen.getByRole("button", {name: "Starts this month"}).className)
            .not.toContain("btn-neutral");
    });

    it("clears the active city filter when a date is selected", async () => {
        mockApi({venues: VENUES, listings: LISTINGS});
        const user = userEvent.setup();

        renderWithClient(<SidePanel/>);

        // Select a city filter and confirm the city item is marked selected.
        await user.click(await screen.findByText("Dallas"));
        expect(useFiltersStore.getState().filters).toEqual({city: "Dallas"});
        expect(screen.getByText("Dallas").className).toContain("btn-neutral");

        // Selecting a date replaces the filter entirely (no city key) and deselects the city.
        await user.click(screen.getByRole("button", {name: "Starts this month"}));
        expect(useFiltersStore.getState().filters).toEqual({date: "starts this month"});
        expect(screen.getByText("Dallas").className).not.toContain("btn-neutral");
    });
});
