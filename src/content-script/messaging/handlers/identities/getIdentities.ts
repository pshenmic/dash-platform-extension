import {IdentitiesRepository} from "../../../repository/IdentitiesRepository";
import {Identity} from "../../../../types/Identity";
import {EventData} from "../../../../types/EventData";

export default function getIdentitiesHandler(identitiesRepository: IdentitiesRepository) {
    return async (data: EventData): Promise<Identity[]> => {
        return identitiesRepository.getAll()
    }
}
