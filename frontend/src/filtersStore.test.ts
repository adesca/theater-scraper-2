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

    it("replaces a city filter with a date filter in both store and URL", () => {
        const store = createFiltersStore();

        store.getState().selectFilter("city", "Dallas");
        store.getState().selectFilter("date", "starts this month");

        expect(store.getState().filters).toEqual({date: "starts this month"});
        expect(window.location.search).toBe("?date=starts+this+month");
    });
});
