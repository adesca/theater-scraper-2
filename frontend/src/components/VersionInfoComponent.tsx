import {useRef} from "react";
import {versionInfo} from "./Versions.tsx";

export const VersionInfoComponent = () => {
    const ref = useRef<HTMLDialogElement>(null);

    return <>
        <svg fill="#ffffff" className={'size-4 cursor-pointer text-base-content/70 hover:text-base-content'} onClick={()=> ref.current?.showModal()}
             version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="-41.7 -41.7 500.38 500.38" xmlSpace="preserve" stroke="#ffffff"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <g> <path d="M356.004,61.156c-81.37-81.47-213.377-81.551-294.848-0.182c-81.47,81.371-81.552,213.379-0.181,294.85 c81.369,81.47,213.378,81.551,294.849,0.181C437.293,274.636,437.375,142.626,356.004,61.156z M237.6,340.786 c0,3.217-2.607,5.822-5.822,5.822h-46.576c-3.215,0-5.822-2.605-5.822-5.822V167.885c0-3.217,2.607-5.822,5.822-5.822h46.576 c3.215,0,5.822,2.604,5.822,5.822V340.786z M208.49,137.901c-18.618,0-33.766-15.146-33.766-33.765 c0-18.617,15.147-33.766,33.766-33.766c18.619,0,33.766,15.148,33.766,33.766C242.256,122.755,227.107,137.901,208.49,137.901z"></path> </g> </g></svg>

        <dialog id="my_modal_1" className="modal" ref={ref}>
            <div className="modal-box prose prose-sm">
                <h3>Version info</h3>

                <div className="max-h-[60vh] overflow-y-auto pr-2">
                    {versionInfo
                        .sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }))
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

