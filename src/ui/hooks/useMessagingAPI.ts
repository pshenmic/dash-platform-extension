import {MessagingAPI} from "../../types/MessagingAPI";
import {MessagingMethods} from "../../types/enums/MessagingMethods";

let messagingAPI: MessagingAPI

export const useMessagingAPI = () => {
    if (!messagingAPI) {
        messagingAPI = new MessagingAPI()
    }

   return messagingAPI
}
