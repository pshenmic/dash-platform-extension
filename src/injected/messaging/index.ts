import onOpenPopupWindow from "./handlers/onOpenPopupWindow";
import {EVENTS} from "../../constants";

export const handlers = [{
    method: EVENTS.OPEN_POPUP_WINDOW,
    handler: onOpenPopupWindow
}]
