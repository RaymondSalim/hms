import {number, object, string} from "zod";

export const locationObject = object({
  name: string().min(1, "Name is required"),
  address: string().min(1, "Address is required"),
});

export const locationObjectWithID = locationObject.extend({
  id: number().positive("ID must be a positive number"),
});
