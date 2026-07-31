import {create} from "zustand";
import {createJSONStorage, persist, type StateStorage} from "zustand/middleware";
import type {Filters} from "./models.ts";

interface FiltersState {
    filters: Filters
    searchString: string
    selectFilter: <T extends keyof Filters>(filterType: NonNullable<T>, value: NonNullable<Filters[T]>) => void
    searchFilter: (value: string) => void
}

const FILTER_PARAM_KEYS = ["date", "city", 'searchString'] as const

function parseDateParam(raw: string): Filters["date"] | undefined {
    if (raw === "starts this month" || raw === "ends this month") return raw
    if (/^\d+$/.test(raw)) return Number(raw)
    return undefined
}

export const urlStorage: StateStorage = {
    getItem: () => {
        const params = new URLSearchParams(window.location.search)
        const filters: Filters = {}
        const city = params.get("city")
        const date = params.get("date")
        const searchString = params.get("searchString")
        if (city) filters.city = city
        if (date) {
            const parsed = parseDateParam(date)
            if (parsed !== undefined) filters.date = parsed
        }
        return JSON.stringify({state: {filters, searchString}, version: 0})
    },
    setItem: (_name, value) => {
        const {state} = JSON.parse(value) as { state: { filters: Filters, searchString: string } }
        const params = new URLSearchParams(window.location.search)
        FILTER_PARAM_KEYS.forEach(key => params.delete(key))
        if (state.filters.city) params.set("city", state.filters.city)
        if (state.filters.date !== undefined) params.set("date", String(state.filters.date))
        if (state.searchString) params.set("searchString", String(state.searchString))
        const search = params.toString()
        window.history.replaceState(window.history.state, "", `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`)
    },
    removeItem: () => {
        const params = new URLSearchParams(window.location.search)
        FILTER_PARAM_KEYS.forEach(key => params.delete(key))
        const search = params.toString()
        window.history.replaceState(window.history.state, "", `${window.location.pathname}${search ? `?${search}` : ""}`)
    },
}

export function createFiltersStore() {
    return create<FiltersState>()(
        persist(
            (set, get) => ({
                filters: {},
                searchString: "",
                selectFilter: (filterType, value) => {
                    const current = get().filters

                    // Reselecting the active value clears that one criterion and leaves the
                    // rest in place, so filters accumulate the same way a shared link does.
                    if (current[filterType] === value) {
                        const remaining = {...current}
                        delete remaining[filterType]
                        set({filters: remaining})
                        return
                    }

                    set({filters: {...current, [filterType]: value}})
                },
                searchFilter: (searchInput: string) => {
                    set({searchString: searchInput})
                }
            }),
            {
                name: "filters",
                storage: createJSONStorage(() => urlStorage),
                partialize: (state) => ({filters: state.filters, searchString: state.searchString}),
            }
        )
    )
}

export const useFiltersStore = createFiltersStore()
