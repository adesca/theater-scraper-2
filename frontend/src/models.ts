export interface Filters {
    date?: 'starts this month' | 'ends this month' | number
    city?: string
}

export const months = ["January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"] as const