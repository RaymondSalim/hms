"use client";

import {TableFormProps} from "@/app/_components/pageContent/TableContent";
import {RoomType} from "@prisma/client";
import React, {useContext, useState} from "react";
import {Button, Input, Typography} from "@material-tailwind/react";
import {HeaderContext} from "@/app/_context/HeaderContext";

interface RoomFormProps extends TableFormProps<RoomType> {
}

export function RoomTypesForm(props: RoomFormProps) {
  const headerContext = useContext(HeaderContext);

  const [roomTypeData, setRoomTypeData] = useState<Partial<RoomType>>(props.contentData ?? {});

  const fieldErrors = {
    ...props.mutationResponse?.errors?.fieldErrors
  };

  return (
    <div className={"w-full px-8 py-4"}>
      <h1 className={"text-xl font-semibold text-black"}>{props.contentData ? "Edit" : "Create"} Room Type</h1>
      <div className={"mt-4"}>
        <div className="mb-1 flex flex-col gap-6">
          {
            roomTypeData.id &&
              <div>
                  <label htmlFor="room_number">
                      <Typography variant="h6" color="blue-gray">
                          ID
                      </Typography>
                  </label>
                  <Input
                      disabled={true}
                      variant="outlined"
                      name="room_number"
                      value={roomTypeData.id}
                      size="lg"
                      className={"!border-t-blue-gray-200 focus:!border-t-gray-900"}
                      labelProps={{
                        className: "before:content-none after:content-none",
                      }}
                  />
              </div>
          }
          <div>
            <label htmlFor="room_type">
              <Typography variant="h6" color="blue-gray">
                Room Type
              </Typography>
            </label>
            <Input
              variant="outlined"
              name="type"
              value={roomTypeData.type}
              onChange={(e) => setRoomTypeData(prevRoomType => ({...prevRoomType, type: e.target.value}))}
              size="lg"
              placeholder="Presidential"
              error={!!fieldErrors.type}
              className={`${!!fieldErrors.type ? "!border-t-red-500" : "!border-t-blue-gray-200 focus:!border-t-gray-900"}`}
              labelProps={{
                className: "before:content-none after:content-none",
              }}
            />
          </div>
          {
            props.mutationResponse?.failure &&
              <Typography variant="h6" color="red" className="-mb-4">
                {props.mutationResponse.failure}
              </Typography>
          }
        </div>

        <div className={"flex gap-x-4 justify-end"}>
          <Button onClick={() => props.setDialogOpen(false)} variant={"outlined"} className="mt-6">
            Cancel
          </Button>
          <Button onClick={() => props.mutation.mutate(roomTypeData)} color={"blue"} className="mt-6"
                  loading={props.mutation.isPending}>
            {props.contentData ? "Update" : "Create"}
          </Button>
        </div>
      </div>
    </div>
  );
}

