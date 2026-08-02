import {versionInfo} from "./components/Versions.tsx";


const TRACKING_ID_KEY = "trackingId";

function getTrackingId(): string {
    let trackingId = localStorage.getItem(TRACKING_ID_KEY);

    if (trackingId) {
        return trackingId;
    }

    trackingId = crypto.randomUUID();
    localStorage.setItem(TRACKING_ID_KEY, trackingId);

    return trackingId;
}

export function trackAction() {
    return (action: string, properties?: Record<string, unknown>) => {
        void fetch(`${import.meta.env.VITE_API_URL}/analytics`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                action, properties,
                trackingId: getTrackingId(),
                screenWidth: window.innerWidth,
                version: versionInfo[0].version
            }),
            keepalive: true
        }).catch(() => {});
    };
}