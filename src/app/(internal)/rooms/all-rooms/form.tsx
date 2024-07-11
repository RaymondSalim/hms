"use client";

import {TableFormProps} from "@/app/_components/pageContent/TableContent";
import {Room} from "@prisma/client";
import React, {useContext, useEffect, useState} from "react";
import {Button, Input, Typography} from "@material-tailwind/react";
import {useQuery} from "@tanstack/react-query";
import {HeaderContext} from "@/app/_context/HeaderContext";
import {getRoomStatuses, getRoomTypes, RoomsWithType} from "@/app/_db/room";
import {SelectComponent, SelectOption} from "@/app/_components/input/select/select";
import {getLocations} from "@/app/_db/location";

interface RoomFormProps extends TableFormProps<RoomsWithType> {
}

export function RoomForm(props: RoomFormProps) {
  const headerContext = useContext(HeaderContext);

  const [roomData, setRoomData] = useState<Partial<Room>>(props.contentData ?? {});

  const fieldErrors = {
    ...props.mutationResponse?.errors?.fieldErrors
  };

  // Room Type Data
  const {data: roomTypeData, isSuccess: roomTypeDataSuccess} = useQuery({
    queryKey: ['rooms.type'],
    queryFn: () => getRoomTypes(),
  });
  const [roomTypeDataMapped, setRoomTypeDataMapped] = useState<SelectOption<number>[]>([]);
  useEffect(() => {
    if (roomTypeDataSuccess) {
      setRoomTypeDataMapped(roomTypeData.map(e => ({
        value: e.id,
        label: e.type
      })));
    }
  }, [roomTypeData, roomTypeDataSuccess]);

  // Status Data
  const {data: statusData, isSuccess: statusDataSuccess} = useQuery({
    queryKey: ['rooms.status'],
    queryFn: () => getRoomStatuses(),
  });
  const [statusDataMapped, setStatusDataMapped] = useState<SelectOption<number>[]>([]);
  useEffect(() => {
    if (statusDataSuccess) {
      setStatusDataMapped(statusData.map(e => ({
        value: e.id,
        label: e.status,
      })));
    }
  }, [statusData, statusDataSuccess]);

  // Location Data
  const {data: locationData, isSuccess: locationDataSuccess} = useQuery({
    queryKey: ['header.location'],
    queryFn: () => getLocations(),
  });
  const [locationDataMapped, setLocationDataMapped] = useState<SelectOption<number>[]>([]);
  useEffect(() => {
    if (locationDataSuccess) {
      setLocationDataMapped(locationData.map(e => ({
        value: e.id,
        label: `${e.name} | ${e.address}`,
      })));
    }
  }, [locationData, locationDataSuccess]);


  return (
    <div className={"w-full px-8 py-4"}>
      <h1 className={"text-xl font-semibold text-black"}>{props.contentData ? "Edit" : "Create"} Room</h1>
      <form className={"mt-4"}>
        <div className="mb-1 flex flex-col gap-6">
          <div>
            <label htmlFor="room_number">
              <Typography variant="h6" color="blue-gray">
                Room Number
              </Typography>
            </label>
            <Input
              variant="outlined"
              name="room_number"
              value={roomData.room_number}
              onChange={(e) => setRoomData(prevRoom => ({...prevRoom, name: e.target.value}))}
              size="lg"
              placeholder="Room 205"
              error={!!fieldErrors.room_number}
              className={`${!!fieldErrors.room_number ? "!border-t-red-500" : "!border-t-blue-gray-200 focus:!border-t-gray-900"}`}
              labelProps={{
                className: "before:content-none after:content-none",
              }}
            />
            {
              fieldErrors.room_number &&
                <Typography color="red">{fieldErrors.room_number}</Typography>
            }
          </div>
          <div>
            <label htmlFor="room_type">
              <Typography variant="h6" color="blue-gray">
                Room Type
              </Typography>
            </label>
            <SelectComponent<number>
              setValue={(v) => setRoomData(prevState => ({...prevState, room_type_id: v}))}
              data={roomTypeDataMapped}
              selectedData={roomTypeDataMapped.find(r => r.value == roomData.room_type_id)}
              placeholder={"Enter room type"}
            />
          </div>
          <div>
            <label htmlFor="status">
              <Typography variant="h6" color="blue-gray">
                Status
              </Typography>
            </label>
            <SelectComponent<number>
              setValue={(v) => setRoomData(prevState => ({...prevState, status_id: v}))}
              data={statusDataMapped}
              selectedData={statusDataMapped.find(r => r.value == roomData.status_id)}
              placeholder={"Enter status"}
            />
          </div>
          <div>
            <label htmlFor="location">
              <Typography variant="h6" color="blue-gray">
                Location
              </Typography>
            </label>
            <SelectComponent<number>
              setValue={(v) => setRoomData(prevState => ({...prevState, location_id: v}))}
              data={locationDataMapped}
              selectedData={
                locationDataMapped.find(r => r.value == roomData.location_id) ??
                locationDataMapped.find(r => r.value == headerContext.locationID)
              }
              placeholder={"Enter location"}
            />
          </div>

          {
            props.mutationResponse?.failure &&
              <Typography variant="h6" color="blue-gray" className="-mb-4">
                {props.mutationResponse.failure}
              </Typography>
          }
        </div>

        <div className={"flex gap-x-4 justify-end"}>
          <Button onClick={() => props.setDialogOpen(false)} variant={"outlined"} className="mt-6">
            Cancel
          </Button>
          <Button onClick={() => props.mutation.mutate(roomData)} color={"blue"} className="mt-6"
                  loading={props.mutation.isPending}>
            {props.contentData ? "Update" : "Create"}
          </Button>
        </div>

      </form>
    </div>
  );
}

