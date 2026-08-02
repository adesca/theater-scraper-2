import {afterEach, beforeEach, describe, expect, it} from "vitest";
import {createFiltersStore} from "./filtersStore.ts";

beforeEach(() => {
    window.history.replaceState(null, "", "/");
});

afterEach(() => {
    window.history.replaceState(null, "", "/");
});

describe("filters store URL hydration", () => {
    it("hydrates a city filter from the URL on creation", () => {
        window.history.replaceState(null, "", "/?city=Dallas");

        const store = createFiltersStore();

        expect(store.getState().filters).toEqual({city: "Dallas"});
    });

    it("hydrates a numeric month filter from the URL on creation", () => {
        window.history.replaceState(null, "", "/?date=3");

        const store = createFiltersStore();

        expect(store.getState().filters).toEqual({date: 3});
    });

    it("hydrates a named date filter from the URL on creation", () => {
        window.history.replaceState(null, "", "/?date=starts%20this%20month");

        const store = createFiltersStore();

        expect(store.getState().filters).toEqual({date: "starts this month"});
    });

    it("writes the selected filter back to the URL", () => {
        const store = createFiltersStore();

        store.getState().selectFilter("city", "Dallas");

        expect(window.location.search).toBe("?city=Dallas");
    });

    it("clears both the store and the URL param when reselecting the same value", () => {
        const store = createFiltersStore();

        store.getState().selectFilter("city", "Dallas");
        store.getState().selectFilter("city", "Dallas");

        expect(store.getState().filters).toEqual({});
        expect(window.location.search).toBe("");
    });

    it("hydrates a city and a date filter together from the URL", () => {
        window.history.replaceState(null, "", "/?city=Dallas&date=7");

        const store = createFiltersStore();

        expect(store.getState().filters).toEqual({city: "Dallas", date: 7});
    });

    it("keeps an existing city filter when a date filter is added", () => {
        const store = createFiltersStore();

        store.getState().selectFilter("city", "Dallas");
        store.getState().selectFilter("date", "starts this month");

        expect(store.getState().filters).toEqual({city: "Dallas", date: "starts this month"});
        expect(window.location.search).toBe("?city=Dallas&date=starts+this+month");
    });

    it("clears only the reselected criterion and leaves the rest applied", () => {
        const store = createFiltersStore();

        store.getState().selectFilter("city", "Dallas");
        store.getState().selectFilter("date", 7);
        store.getState().selectFilter("date", 7);

        expect(store.getState().filters).toEqual({city: "Dallas"});
        expect(window.location.search).toBe("?city=Dallas");
    });

    it("clears every criterion, the search string and the URL in one call", () => {
        const store = createFiltersStore();

        store.getState().selectFilter("city", "Dallas");
        store.getState().selectFilter("date", 7);
        store.getState().searchFilter("rocky");

        store.getState().clearFilters();

        expect(store.getState().filters).toEqual({});
        expect(store.getState().searchString).toBe("");
        expect(window.location.search).toBe("");
    });

    it("leaves an already-empty store untouched when clearing", () => {
        const store = createFiltersStore();

        store.getState().clearFilters();

        expect(store.getState().filters).toEqual({});
        expect(store.getState().searchString).toBe("");
        expect(window.location.search).toBe("");
    });

    it("replaces the value when the same criterion is selected twice with different values", () => {
        const store = createFiltersStore();

        store.getState().selectFilter("city", "Dallas");
        store.getState().selectFilter("city", "Plano");

        expect(store.getState().filters).toEqual({city: "Plano"});
        expect(window.location.search).toBe("?city=Plano");
    });
});
