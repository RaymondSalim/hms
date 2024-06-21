import {number, object, string} from "zod";

export const roomObject = object({
    room_number: string({required_error: "Room Number is required"}),
    room_type_id: number({required_error: "Room Type ID is required"}),
    status_id: number({required_error: "Status ID is required"}),
    location_id: number({required_error: "Location ID is required"}),
});

export const roomObjectWithID = roomObject.extend({
    id: number().positive()
}).required();
