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
            "Clicking show titles will take you to the original listing page."
        ],
        bugs: [
            "Fixed several issues with city filtering.",
        ],
    }
];