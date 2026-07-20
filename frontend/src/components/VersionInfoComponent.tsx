import {useRef} from "react";
import {versionInfo} from "./Versions.tsx";

export const VersionInfoComponent = () => {
    const ref = useRef<HTMLDialogElement>(null);
    const sortedVersionInfo = versionInfo.toSorted((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }))

    return <>
        <span className={'cursor-pointer opacity-70 hover:opacity-100 hover:underline transition-all'} title={'View changelog'} onClick={()=> ref.current?.showModal()}>{sortedVersionInfo[0].version}</span>

        <dialog id="my_modal_1" className="modal" ref={ref}>
            <div className="modal-box prose prose-sm">
                <h3>Version info</h3>

                <div className="max-h-[60vh] overflow-y-auto pr-2">
                    {sortedVersionInfo
                        .map(({ version, notes, bugs }) => (
                            <section key={version} className="mb-8">
                                <h3 className="text-lg font-bold">{version}</h3>

                                {notes && (
                                    <>
                                        <h4 className="mt-2 text-sm font-semibold text-primary">
                                            ✨ What's New ✨
                                        </h4>
                                        <ul className="list-disc ml-6">
                                            {notes.map(note => (
                                                <li key={note!.toString()}>{note}</li>
                                            ))}
                                        </ul>
                                    </>
                                )}

                                {bugs && (
                                    <>
                                        <h4 className="mt-3 text-sm font-semibold text-warning">
                                            🐛 Bug Fixes 🐛
                                        </h4>
                                        <ul className="list-disc ml-6 marker:text-warning">
                                            {bugs.map(bug => (
                                                <li key={bug!.toString()}>{bug}</li>
                                            ))}
                                        </ul>
                                    </>
                                )}
                            </section>
                        ))}
                </div>

                <div className="modal-action">
                    <form method="dialog">
                        <button className="btn">Close</button>
                    </form>
                </div>
            </div>
        </dialog>
    </>
}

