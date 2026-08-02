import type {ReactNode} from "react";

type Release = {
    version: string;
    notes?: ReactNode[];
    bugs?: ReactNode[];
};

export const versionInfo: Release[] = [
    {
        version: "1.0.0",
        notes: [
            <>Pulls data from <a href={"https://goodshow.breaklegs.com/"}>Breaklegs</a></>,
            "Supports filtering by month, shows starting this month, and shows ending this month",
        ],
    },
    {
        version: "1.1.0",
        notes: [
            <>Pulls data from <a href={"https://ntpa.org/tickets"}>NTPA</a></>,
        ],
    },
    {
        version: "1.2.0",
        notes: [
            "Enables filtering by city",
            "URLs can be shared now! Give your url to a friend and they'll see your same search",
            "Some UX improvements"
        ],
        bugs: [
            "Fix bug that accidentally broke filtering by month (whoops)"
        ]
    },
    {
        version: "1.2.1",
        notes: [
            "Clicking show titles will take you to the original listing page.",
            "Free text search that filters shown listings to show names and theater names",
            "Attribution pills!"
        ],
        bugs: [
            "Fixed several issues with city filtering.",
        ],
    },
    {
        version: "1.2.2",
        notes: [
            "Special backend work, shhh"
        ],
        bugs: [
            "Filters would drop silently if you had multiple active at once",
            "Tennessee wet rub was appearing twice when, really, we only need to see it once"
        ],
    },
    {
        version: "1.3",
        notes: [
            "Adds support for a mobile view! And now the show listing count animates as it changes!"
        ]
    }
]
    .toSorted((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));