import {useRef} from "react";

export const VersionInfoComponent = () => {
    const ref = useRef<HTMLDialogElement>(null);

    return <>
        <svg fill="#ffffff" className={'size-4 cursor-pointer text-base-content/70 hover:text-base-content'} onClick={()=> ref.current?.showModal()}
             version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="-41.7 -41.7 500.38 500.38" xmlSpace="preserve" stroke="#ffffff"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g> <path d="M356.004,61.156c-81.37-81.47-213.377-81.551-294.848-0.182c-81.47,81.371-81.552,213.379-0.181,294.85 c81.369,81.47,213.378,81.551,294.849,0.181C437.293,274.636,437.375,142.626,356.004,61.156z M237.6,340.786 c0,3.217-2.607,5.822-5.822,5.822h-46.576c-3.215,0-5.822-2.605-5.822-5.822V167.885c0-3.217,2.607-5.822,5.822-5.822h46.576 c3.215,0,5.822,2.604,5.822,5.822V340.786z M208.49,137.901c-18.618,0-33.766-15.146-33.766-33.765 c0-18.617,15.147-33.766,33.766-33.766c18.619,0,33.766,15.148,33.766,33.766C242.256,122.755,227.107,137.901,208.49,137.901z"></path> </g> </g></svg>

        <dialog id="my_modal_1" className="modal" ref={ref}>
            <div className="modal-box prose prose-sm">
                <h3 className="">Version info</h3>

                <div>1.0.0
                    <ul>
                        <li>Pulls data from <a href={"https://goodshow.breaklegs.com/"}>Breaklegs</a></li>
                        <li>Supports filtering by month, shows starting this month, and shows ending this month</li>
                    </ul>
                </div>
                <div>1.1.0 - Pulls data from <a href={"https://ntpa.org/tickets"}>NTPA</a></div>
                <div>1.2.0
                    <ul>
                        <li>Enables filtering by city</li>
                    </ul>
                </div>
                <p className="">Press ESC key or click the button below to close</p>
                <div className="modal-action">
                    <form method="dialog">
                        {/* if there is a button in form, it will close the modal */}
                        <button className="btn">Close</button>
                    </form>
                </div>
            </div>
        </dialog>
    </>
}
