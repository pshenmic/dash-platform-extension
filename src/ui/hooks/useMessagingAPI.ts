import {MessagingAPI} from "../../types/MessagingAPI";

let messagingAPI: MessagingAPI

export const useMessagingAPI = () => {
    if (!messagingAPI) {
        messagingAPI = new MessagingAPI()
    }

   return messagingAPI
}
