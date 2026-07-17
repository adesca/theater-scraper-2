import {create} from "zustand";
import {createJSONStorage, persist, type StateStorage} from "zustand/middleware";
import type {Filters} from "./models.ts";

interface FiltersState {
    filters: Filters
    selectFilter: <T extends keyof Filters>(filterType: NonNullable<T>, value: NonNullable<Filters[T]>) => void
}

const FILTER_PARAM_KEYS = ["date", "city"] as const

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
        if (city) filters.city = city
        if (date) {
            const parsed = parseDateParam(date)
            if (parsed !== undefined) filters.date = parsed
        }
        return JSON.stringify({state: {filters}, version: 0})
    },
    setItem: (_name, value) => {
        const {state} = JSON.parse(value) as { state: { filters: Filters } }
        const params = new URLSearchParams(window.location.search)
        FILTER_PARAM_KEYS.forEach(key => params.delete(key))
        if (state.filters.city) params.set("city", state.filters.city)
        if (state.filters.date !== undefined) params.set("date", String(state.filters.date))
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
                selectFilter: (filterType, value) => {
                    if (get().filters[filterType] === value) {
                        set({filters: {}})
                        return
                    }
                    set({filters: {[filterType]: value} as Filters})
                },
            }),
            {
                name: "filters",
                storage: createJSONStorage(() => urlStorage),
                partialize: (state) => ({filters: state.filters}),
            }
        )
    )
}

export const useFiltersStore = createFiltersStore()
