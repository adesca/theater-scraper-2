/// import "typed-query-selector";
import { DOMParser } from "linkedom";
import {ParseSelector} from "typed-query-selector/parser";

const domParser = new DOMParser();

export function parseDocument(inputHtml: string) {
    const document = domParser.parseFromString(inputHtml, "text/html");

    return {
        $<S extends string>(selector: S): ParseSelector<S> | null {
            return document.querySelector(selector) as unknown as ParseSelector<S> | null;
        },

        $$<S extends string>(selector: S): NodeListOf<ParseSelector<S>> {
            return document.querySelectorAll(selector) as unknown as NodeListOf<ParseSelector<S>>;
        }
    };
}