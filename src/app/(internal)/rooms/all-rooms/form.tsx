"use client";

import {TableFormProps} from "@/app/_components/pageContent/TableContent";
import React, {useContext, useEffect, useState} from "react";
import {Button, Input, Typography} from "@material-tailwind/react";
import {useQuery} from "@tanstack/react-query";
import {HeaderContext} from "@/app/_context/HeaderContext";
import {getRoomStatuses, getRoomTypes, RoomsWithTypeAndLocation, RoomTypeDurationWithDuration} from "@/app/_db/room";
import {SelectComponent, SelectOption} from "@/app/_components/input/select/select";
import {getLocations} from "@/app/_db/location";
import {getDurations} from "@/app/_db/duration";
import {Prisma} from "@prisma/client";

interface RoomFormProps extends TableFormProps<RoomsWithTypeAndLocation> {
}

export function RoomForm(props: RoomFormProps) {
  const headerContext = useContext(HeaderContext);

  const [roomData, setRoomData] = useState<Partial<RoomsWithTypeAndLocation>>(props.contentData ?? {});

  const fieldErrors = {
    ...props.mutationResponse?.errors?.fieldErrors
  };

  const {data: durationsData, isSuccess: durationsDataSuccess, isLoading} = useQuery({
    queryKey: ['rooms.durations'],
    queryFn: () => getDurations(),
  });
  useEffect(() => {
    if (durationsDataSuccess) {
      let originalRoomTypeDurations: RoomTypeDurationWithDuration[] = structuredClone(roomData).roomtypes?.roomtypedurations ?? [];
      setRoomData(prevRoom => {
        durationsData?.forEach((d, index) => {

          if (prevRoom.roomtypes && !prevRoom.roomtypes?.roomtypedurations) {
            prevRoom.roomtypes!.roomtypedurations = [];
          }

          const target = originalRoomTypeDurations?.find(rtd => rtd && rtd.durations?.id == d.id);
          if (!target) {
            // @ts-ignore
            prevRoom.roomtypes!.roomtypedurations[index] = {
              room_type_id: prevRoom.roomtypes!.id,
              location_id: prevRoom.location_id!,
              durations: d,
            };
          } else {
            prevRoom.roomtypes!.roomtypedurations[index] = target;
          }
        });

        return {...prevRoom};
      });
    }

  }, [durationsData, durationsDataSuccess]);

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
              onChange={(e) => setRoomData(prevRoom => ({...prevRoom, room_number: e.target.value}))}
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
              // @ts-ignore
              setValue={(v) => setRoomData(prevState => ({
                ...prevState,
                roomtypes: v && {id: v, roomtypedurations: []}
              }))}
              data={roomTypeDataMapped}
              selectedData={roomTypeDataMapped.find(r => r.value == roomData.roomtypes?.id)}
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
              // @ts-ignore
              setValue={(v) => setRoomData(prevState => ({...prevState, roomstatuses: {id: v}}))}
              data={statusDataMapped}
              selectedData={statusDataMapped.find(r => r.value == roomData.roomstatuses?.id)}
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
            durationsDataSuccess &&
              <div>
                  <Typography variant="h5" color="blue-gray">
                      Pricing
                  </Typography>
                {
                  durationsData?.map((d, index) => {

                    return (
                      <div key={d.id}>
                        <label htmlFor={d.duration}>
                          <Typography variant="h6" color="blue-gray">
                            {d.duration}
                          </Typography>
                        </label>
                        <Input
                          disabled={roomData.roomtypes == undefined || roomData.location_id == undefined}
                          variant="outlined"
                          min="0"
                          type="number"
                          name={d.duration}
                          value={Number(roomData.roomtypes?.roomtypedurations[index]?.suggested_price) ?? ""}
                          onChange={(e) => {
                            if (isNaN(Number(e.currentTarget.value))) {
                              return;
                            }

                            setRoomData(prevRoom => {
                              if (e.target.value.length == 0) {
                                // @ts-ignore
                                prevRoom.roomtypes.roomtypedurations[index].suggested_price = undefined;
                                return {...prevRoom};
                              }

                              if (prevRoom.roomtypes?.roomtypedurations[index]) {
                                prevRoom.roomtypes.roomtypedurations[index].suggested_price = new Prisma.Decimal(e.target.value);
                              } else {
                                // @ts-ignore
                                prevRoom.roomtypes.roomtypedurations[index] = {
                                  room_type_id: prevRoom.roomtypes!.id,
                                  location_id: prevRoom.location_id!,
                                  durations: d,
                                  suggested_price: new Prisma.Decimal(e.target.value)
                                };
                              }

                              return {...prevRoom};
                            });
                          }}
                          size="lg"
                          placeholder="5000000"
                          error={!!fieldErrors.room_number} /*TODO*/
                          className={`${!!fieldErrors.room_number ? "!border-t-red-500" : "!border-t-blue-gray-200 focus:!border-t-gray-900"}`} /*TODO!*/
                          labelProps={{
                            className: "before:content-none after:content-none",
                          }}
                        />
                        {
                          /*TODO!*/
                          fieldErrors.room_number &&
                            <Typography color="red">{fieldErrors.room_number}</Typography>
                        }
                      </div>
                    );
                  })
                }
              </div>
          }
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

