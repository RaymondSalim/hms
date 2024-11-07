"use client";

import {TableFormProps} from "@/app/_components/pageContent/TableContent";
import React, {useEffect, useState} from "react";
import {Button, Input, Typography} from "@material-tailwind/react";
import {useQuery} from "@tanstack/react-query";
import {
  getRoomStatuses,
  getRoomTypeDurationsByRoomTypeIDAndLocationID,
  getRoomTypes,
  RoomsWithTypeAndLocation,
  RoomTypeDurationWithDuration
} from "@/app/_db/room";
import {SelectComponent, SelectOption} from "@/app/_components/input/select/select";
import {getLocations} from "@/app/_db/location";
import {getSortedDurations} from "@/app/_db/duration";
import {Prisma} from "@prisma/client";
import {AiOutlineLoading} from "react-icons/ai";
import {ZodFormattedError} from "zod";
import CurrencyInput from "@/app/_components/input/currencyInput";

interface RoomFormProps extends TableFormProps<RoomsWithTypeAndLocation> {
}

export function RoomForm(props: RoomFormProps) {
  const [roomData, setRoomData] = useState<Partial<RoomsWithTypeAndLocation>>(props.contentData ?? {});
  const [durationReady, setDurationReady] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<ZodFormattedError<RoomsWithTypeAndLocation> | undefined>(props.mutationResponse?.errors);

  useEffect(() => {
    setFieldErrors(props.mutationResponse?.errors);
  }, [props.mutationResponse?.errors]);

  useEffect(() => {
    // @ts-ignore
    if (roomData.roomtypes == undefined) {
      // @ts-ignore
      setRoomData(p => ({
        ...p,
        roomtypes: {
          roomtypedurations: [],
        }
      }));
    }
  }, []);

  const {data: durationsData, isSuccess: durationsDataSuccess, isLoading} = useQuery({
    queryKey: ['rooms.durations'],
    queryFn: () => getSortedDurations(),
  });
  useEffect(() => {
    setDurationReady(false);
    if (durationsDataSuccess) {
      let originalRoomTypeDurations: RoomTypeDurationWithDuration[] = structuredClone(roomData).roomtypes?.roomtypedurations ?? [];
      setRoomData(prevRoom => {
        durationsData?.forEach((d, index) => {
          if (!prevRoom.roomtypes || !prevRoom.roomtypes.roomtypedurations) {
            // @ts-ignore
            prevRoom.roomtypes = {
              roomtypedurations: []
            };
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
    setDurationReady(true);

  }, [durationsData, durationsDataSuccess, roomData.roomtypes?.id]);

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

  // Room Type Duration Data
  let {
    data: roomTypeDurationData,
    isSuccess: roomTypeDurationDataSuccess,
    isLoading: roomTypeDurationDataLoading
  } = useQuery({
    queryKey: ['rooms.typeduration', roomData.roomtypes?.id, roomData.location_id],
    queryFn: () => getRoomTypeDurationsByRoomTypeIDAndLocationID(roomData.roomtypes?.id, roomData.location_id),
    enabled: Boolean(roomData.roomtypes?.id && roomData.location_id)
  });
  useEffect(() => {
    if (durationReady && roomTypeDurationDataSuccess) {
      setRoomData(prevRoom => {
        if (prevRoom.location_id && (roomTypeDurationData?.length ?? 0 > 0)) {
          if (prevRoom.roomtypes) {
            prevRoom.roomtypes.roomtypedurations.forEach((rtd, index) => {
              prevRoom.roomtypes!.roomtypedurations[index] = roomTypeDurationData?.find(rtdf => rtdf.durations.id == rtd.durations.id) ?? rtd;
            });
          }
        } else {
          durationsData?.forEach((d, index) => {
            // @ts-ignore
            prevRoom.roomtypes!.roomtypedurations[index] = {
              room_type_id: prevRoom.roomtypes!.id,
              location_id: prevRoom.location_id!,
              durations: d,
              // @ts-ignore
              suggested_price: undefined,
            };
          });
        }

        return structuredClone(prevRoom);
      });
    }
  }, [durationReady, roomTypeDurationData, roomTypeDurationDataSuccess]);

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

  // Remove RTD
  useEffect(() => {
    if (roomData.location_id == undefined && roomData.roomtypes?.id == undefined) {
      // @ts-ignore
      setRoomData(prevRoom => ({
        ...prevRoom,
        roomtypes: {
          ...prevRoom.roomtypes,
          roomtypedurations: []
        }
      }));
    }
  }, [roomData.location_id, roomData.roomtypes?.id]);

  return (
    <div className={"w-full px-8 py-4"}>
      <h1 className={"text-xl font-semibold text-black"}>{props.contentData ? "Perubahan" : "Pembuatan"} Kamar</h1>
      <form className={"mt-4"}>
        <div className="mb-1 flex flex-col gap-6">
          <div>
            <label htmlFor="room_number">
              <Typography variant="h6" color="blue-gray">
                Nomor Kamar
              </Typography>
            </label>
            <Input
              variant="outlined"
              name="room_number"
              value={roomData.room_number}
              onChange={(e) => setRoomData(prevRoom => ({...prevRoom, room_number: e.target.value}))}
              size="lg"
              placeholder="Room 205"
              error={!!fieldErrors?.room_number}
              className={`${!!fieldErrors?.room_number ? "!border-t-red-500" : "!border-t-blue-gray-200 focus:!border-t-gray-900"}`}
              labelProps={{
                className: "before:content-none after:content-none",
              }}
            />
            {
              fieldErrors?.room_number &&
                <Typography color="red">{fieldErrors?.room_number._errors}</Typography>
            }
          </div>
          <div>
            <label htmlFor="room_type">
              <Typography variant="h6" color="blue-gray">
                Tipe Kamar
              </Typography>
            </label>
            <SelectComponent<number>
              // @ts-ignore
              setValue={(v) => setRoomData(prevState => ({
                ...prevState,
                roomtypes: v && {id: v, roomtypedurations: []}
              }))}
              options={roomTypeDataMapped}
              selectedOption={roomTypeDataMapped.find(r => r.value == roomData.roomtypes?.id)}
              placeholder={"Enter room type"}
              isError={!!fieldErrors?.roomtypes?.id}
            />
            {
              fieldErrors?.roomtypes &&
                <Typography color="red">{fieldErrors?.roomtypes?.id?._errors}</Typography>
            }
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
              options={statusDataMapped}
              selectedOption={statusDataMapped.find(r => r.value == roomData.roomstatuses?.id)}
              placeholder={"Enter status"}
              isError={!!fieldErrors?.roomstatuses}
            />
            {
              fieldErrors?.roomstatuses &&
                <Typography color="red">{fieldErrors?.roomstatuses._errors}</Typography>
            }
          </div>
          <div>
            <label htmlFor="location">
              <Typography variant="h6" color="blue-gray">
                Lokasi
              </Typography>
            </label>
            <SelectComponent<number>
              setValue={(v) => setRoomData(prevState => {
                return structuredClone({...prevState, location_id: v});
              })}
              options={locationDataMapped}
              selectedOption={
                locationDataMapped.find(r => r.value == roomData.location_id)
              }
              placeholder={"Masukan Lokasi"}
              isError={!!fieldErrors?.location_id}
            />
            {
              fieldErrors?.location_id &&
                <Typography color="red">{fieldErrors?.location_id._errors}</Typography>
            }
          </div>
          {
            roomTypeDurationDataLoading &&
              <div className={"flex items-center justify-center"}>
                  <AiOutlineLoading size={"3rem"} className={"animate-spin my-8"}/>
              </div>
          }
          {
            roomData.roomtypes?.roomtypedurations && roomTypeDurationDataSuccess &&
              <div>
                  <Typography variant="h5" color="blue-gray">
                      Harga
                  </Typography>
                {
                  roomData.roomtypes?.roomtypedurations?.map((d, index) => {
                    return (
                      <div key={d.id}>
                        <label htmlFor={d.durations.duration}>
                          <Typography variant="h6" color="blue-gray">
                            {d.durations.duration}
                          </Typography>
                        </label>
                        <CurrencyInput
                            disabled={roomData.roomtypes == undefined || roomData.location_id == undefined}
                            name={d.durations.duration}
                            value={Number(roomData.roomtypes?.roomtypedurations[index]?.suggested_price) ?? ""}
                            setValue={(newValue) => {
                              setRoomData(prevRoom => {
                                if (newValue == undefined) {
                                  // @ts-ignore
                                  prevRoom.roomtypes.roomtypedurations[index].suggested_price = null;
                                  return {...prevRoom};
                                }

                                if (prevRoom.roomtypes?.roomtypedurations[index]) {
                                  prevRoom.roomtypes.roomtypedurations[index].suggested_price = new Prisma.Decimal(newValue);
                                } else {
                                  // @ts-ignore
                                  prevRoom.roomtypes.roomtypedurations[index] = {
                                    room_type_id: prevRoom.roomtypes!.id,
                                    location_id: prevRoom.location_id!,
                                    durations: d.durations,
                                    suggested_price: new Prisma.Decimal(newValue)
                                  };
                                }

                                return {...prevRoom};
                              });
                            }}
                            size="lg"
                            className={"!border-t-blue-gray-200 focus:!border-t-gray-900"}
                            labelProps={{
                              className: "before:content-none after:content-none",
                            }}
                        />
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
            Batal
          </Button>
          <Button onClick={() => props.mutation.mutate(roomData)} color={"blue"} className="mt-6"
                  loading={props.mutation.isPending}>
            {props.contentData ? "Ubah" : "Buat"}
          </Button>
        </div>
      </form>
    </div>
  );
}

