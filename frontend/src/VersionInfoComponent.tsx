import infoIcon from './assets/info-icon-svgrepo-com.svg'

export const VersionInfoComponent = () => <>
    <img src={infoIcon} className="size-4 cursor-pointer text-base-content/70 hover:text-base-content " alt="Update information" onClick={()=>document.getElementById('my_modal_1').showModal()} />
    {/*<button className="btn btn-soft btn-info" onClick={()=>document.getElementById('my_modal_1').showModal()}>Updates</button>*/}

    <dialog id="my_modal_1" className="modal">
        <div className="modal-box prose prose-sm">
            <h3 className="">Version info</h3>

            <div>1.0.0
                <ul>
                    <li>Pulls data from <a href={"https://goodshow.breaklegs.com/"}>Breaklegs</a></li>
                    <li>Supports filtering by month, shows starting this month, and shows ending this month</li>
                </ul>
            </div>
            <div>1.1.0 - Pulls data from <a href={"https://ntpa.org/tickets"}>NTPA</a></div>
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