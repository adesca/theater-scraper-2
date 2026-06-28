import type {Filters} from "./models.ts";

interface Props {
    onFilterChange: (input: Filters) => void;
}
export function SidePanel(props: Props) {
    return <>
        <h2>Filters</h2>
        <h3>Date</h3>
        <button className={'btn btn-sm btn-outline mx-2'} onClick={() => props.onFilterChange({date: 'starts this month'})}>Starts this month</button>
        <button className={'btn btn-sm btn-outline mx-2'} onClick={() => props.onFilterChange({date: 'ends this month'})}>Ends this month</button>
    </>
}