import {IdentitiesRepository} from "../../../repository/IdentitiesRepository";
import {Identity} from "../../../../types/Identity";
import {EventData} from "../../../../types/EventData";

export default function getCurrentIdentity(identitiesRepository: IdentitiesRepository) {
    return async (data: EventData): Promise<Identity> => {
        return identitiesRepository.getCurrentIdentity()
    }
}
