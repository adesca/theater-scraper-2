import {createListCollection, Listbox} from "@ark-ui/react/listbox"
import {useState} from "react";

interface Props {
    items: Array<{ label: string, value: string, group: string }>
    label: string
    onSelect: (selectedItem: string) => void
    selected: string | null

    placeholder?: string
}

export function ListboxSelect(props: Props) {
    const [activeFilter, setActiveFilter] = useState("");

    const collection = createListCollection({
        items: props.items.filter(item => item.label.toLowerCase().includes(activeFilter.toLowerCase())),
        groupBy: (item) => item.group
    })
    return (
        <fieldset className={'prose prose-sm w-xs p-4 h-80 flex flex-col'}>
            <legend className="fieldset-legend">{props.label}</legend>

            <Listbox.Root collection={collection} className={'flex flex-col flex-1 min-h-0'}>
                <Listbox.Label className={'input input-sm'}>
                    <svg className="h-[1em] opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <g
                            strokeLinejoin="round"
                            strokeLinecap="round"
                            strokeWidth="2.5"
                            fill="none"
                            stroke="currentColor"
                        >
                          <circle cx="11" cy="11" r="8"></circle>
                          <path d="m21 21-4.3-4.3"></path>
                        </g>
                    </svg>
                    <Listbox.Input type={'search'}
                                   placeholder={props.placeholder ?? props.label}
                                   onChange={(e) => setActiveFilter(e.target.value)}
                    />
                </Listbox.Label>

                <Listbox.Content className={'flex-1 overflow-y-auto'}>
                    {collection.group().map(([group, items]) => (
                        <Listbox.ItemGroup key={group}>
                            <Listbox.ItemGroupLabel><h4>{group} ({items.length})</h4></Listbox.ItemGroupLabel>
                            {items.map((item) => (
                                <Listbox.Item key={item.value} item={item} onClick={() => props.onSelect(item.value)}>
                                    <Listbox.ItemText className={"rounded-lg border border-transparent px-3 py-1.5 text-sm" +
                                        " hover:text-primary cursor-pointer " +
                                        (props.selected  === item.value ? 'btn-neutral btn' : '')}>{item.label}</Listbox.ItemText>
                                </Listbox.Item>
                            ))}
                        </Listbox.ItemGroup>
                    ))}
                </Listbox.Content>
            </Listbox.Root>
        </fieldset>
    )
}