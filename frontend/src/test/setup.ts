import {afterEach} from "vitest";
import {cleanup} from "@testing-library/react";

// Unmount anything rendered by a test once it finishes so tests stay isolated.
afterEach(() => {
    cleanup();
});
