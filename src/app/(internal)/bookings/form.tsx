"use client";

import {TableFormProps} from "@/app/_components/pageContent/TableContent";
import React, {useEffect, useState} from "react";
import {Button, Input, Popover, PopoverContent, PopoverHandler, Typography} from "@material-tailwind/react";
import {useQuery} from "@tanstack/react-query";
import {getRooms} from "@/app/_db/room";
import {SelectComponent, SelectOption} from "@/app/_components/input/select/select";
import {getLocations} from "@/app/_db/location";
import {getSortedDurations} from "@/app/_db/duration";
import {Booking, Prisma} from "@prisma/client";
import {ZodFormattedError} from "zod";
import {getBookingStatuses} from "@/app/_db/bookings";
import {getTenants} from "@/app/_db/tenant";
import {DayPicker} from "react-day-picker";
import {formatToDateTime} from "@/app/_lib/util";
import "react-day-picker/style.css";

interface BookingFormProps extends TableFormProps<Booking> {
}

export function BookingForm(props: BookingFormProps) {
  const [bookingData, setBookingData] = useState<Partial<Booking>>(props.contentData ?? {});
  const [fieldErrors, setFieldErrors] = useState<ZodFormattedError<Booking> | undefined>(props.mutationResponse?.errors);
  const [locationID, setLocationID] = useState<number | undefined>(undefined);

  useEffect(() => {
    setFieldErrors(props.mutationResponse?.errors);
  }, [props.mutationResponse?.errors]);

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
        label: `${e.name}`,
      })));
    }
  }, [locationData, locationDataSuccess]);

  const {data: roomData, isSuccess: roomDataSuccess} = useQuery({
    queryKey: ['rooms', locationID],
    queryFn: () => getRooms(undefined, locationID),

    enabled: locationID != undefined,
  });
  const [roomDataMapped, setRoomDataMapped] = useState<SelectOption<number>[]>([]);
  useEffect(() => {
    if (roomDataSuccess) {
      setRoomDataMapped(roomData.map(r => ({
        value: r.id,
        label: `${r.room_number} | ${r.roomtypes?.type}`,
      })));
    }
  }, [roomData, roomDataSuccess]);

  const {data: durationsData, isSuccess: durationsDataSuccess, isLoading} = useQuery({
    queryKey: ['rooms.durations'],
    queryFn: () => getSortedDurations(),
  });
  const [durationDataMapped, setDurationDataMapped] = useState<SelectOption<number>[]>([]);
  useEffect(() => {
    if (durationsDataSuccess) {
      setDurationDataMapped(durationsData.map(d => ({
        value: d.id,
        label: `${d.duration}`
      })));
    }
  }, [durationsData, durationsDataSuccess]);

  // Status Data
  const {data: statusData, isSuccess: statusDataSuccess} = useQuery({
    queryKey: ['bookings.status'],
    queryFn: () => getBookingStatuses(),
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

  // Tenant Data
  const {data: tenantData, isSuccess: tenantDataSuccess} = useQuery({
    queryKey: ['tenants'],
    queryFn: () => getTenants(),
  });
  const [tenantDataMapped, setTenantDataMapped] = useState<SelectOption<string>[]>([]);
  useEffect(() => {
    if (tenantDataSuccess) {
      setTenantDataMapped(tenantData.map(e => ({
        value: e.id,
        label: `${e.name} | ${e.phone}`,
      })));
    }
  }, [tenantData, tenantDataSuccess]);

  const [popoverOpen, setIsPopoverOpen] = useState(false);

  // Suggested Pricing
  useEffect(() => {
    if (bookingData.room_id && bookingData.duration_id) {
      const targetRt = roomData?.find(r =>
        r.id == bookingData.room_id
      )?.roomtypes;

      const targetRtd = targetRt?.roomtypedurations?.find(rtd => rtd.duration_id == bookingData.duration_id);

      if (targetRtd) {
        if (typeof targetRtd.suggested_price == "string") {
          targetRtd.suggested_price = new Prisma.Decimal(targetRtd.suggested_price);
        }
        setBookingData(p => ({
          ...p,
          fee: targetRtd.suggested_price ?? undefined
        }));
      }
    }
  }, [roomData, bookingData.room_id, bookingData.duration_id]);

  return (
    <div className={"w-full px-8 py-4"}>
      <h1 className={"text-xl font-semibold text-black"}>{props.contentData ? "Edit" : "Create"} Booking</h1>
      <form className={"mt-4"}>
        <div className="mb-1 flex flex-col gap-6">
          <div>
            <label htmlFor="tenant_id">
              <Typography variant="h6" color="blue-gray">
                Tenant
              </Typography>
            </label>
            <SelectComponent<string>
              setValue={(v) => setBookingData(prev => ({...prev, tenant_id: v}))}
              options={tenantDataMapped}
              selectedOption={
                tenantDataMapped.find(r => r.value == bookingData.tenant_id)
              }
              placeholder={"Pick Tenant"}
              isError={!!fieldErrors?.tenant_id}
            />
            {
              fieldErrors?.tenant_id &&
                <Typography color="red">{fieldErrors?.tenant_id._errors}</Typography>
            }
          </div>
          <div>
            <label htmlFor="location">
              <Typography variant="h6" color="blue-gray">
                Location
              </Typography>
            </label>
            <SelectComponent<number>
              setValue={(v) => setLocationID(v)}
              options={locationDataMapped}
              selectedOption={
                locationDataMapped.find(r => r.value == locationID)
              }
              placeholder={"Enter location"}
              isError={false}
            />
          </div>
          <div>
            <label htmlFor="room_id">
              <Typography variant="h6" color="blue-gray">
                Room
              </Typography>
            </label>
            <SelectComponent<number>
              setValue={(v) => setBookingData(p => ({
                ...p,
                room_id: v
              }))}
              options={roomDataMapped}
              selectedOption={
                roomDataMapped.find(r => r.value == bookingData.room_id)
              }
              placeholder={"Pick room"}
              isError={!!fieldErrors?.room_id}
              isDisabled={locationID == undefined}
            />
            {
              fieldErrors?.room_id &&
                <Typography color="red">{fieldErrors?.room_id._errors}</Typography>
            }
          </div>
          <div>
            <label htmlFor="duration_id">
              <Typography variant="h6" color="blue-gray">
                Duration
              </Typography>
            </label>
            <SelectComponent<number>
              setValue={(v) => setBookingData(p => ({
                ...p,
                duration_id: v
              }))}
              options={durationDataMapped}
              selectedOption={
                durationDataMapped.find(r => r.value == bookingData.duration_id)
              }
              placeholder={"Pick duration"}
              isError={!!fieldErrors?.duration_id}
            />
            {
              fieldErrors?.duration_id &&
                <Typography color="red">{fieldErrors?.duration_id._errors}</Typography>
            }
          </div>
          <div>
            <label htmlFor="fee">
              <Typography variant="h6" color="blue-gray">
                Fee
              </Typography>
            </label>
            <Input
              variant="outlined"
              name="fee"
              disabled={bookingData.room_id == undefined || bookingData.duration_id == undefined}
              value={Number(bookingData.fee) || ""}
              onChange={(e) => setBookingData(prevRoom => ({...prevRoom, fee: new Prisma.Decimal(e.target.value)}))}
              size="lg"
              placeholder="500000"
              error={!!fieldErrors?.fee}
              className={`${!!fieldErrors?.fee ? "!border-t-red-500" : "!border-t-blue-gray-200 focus:!border-t-gray-900"}`}
              labelProps={{
                className: "before:content-none after:content-none",
              }}
            />
            {
              fieldErrors?.fee &&
                <Typography color="red">{fieldErrors?.fee._errors}</Typography>
            }
          </div>
          <div>
            <label htmlFor="check_in">
              <Typography variant="h6" color="blue-gray">
                Check in Date
              </Typography>
            </label>
            <Popover
              open={popoverOpen}
              handler={() => setIsPopoverOpen(p => !p)}
              placement="bottom-start"
            >
              <PopoverHandler>
                <Input
                  variant="outlined"
                  size="lg"
                  onChange={() => null}
                  value={bookingData.check_in ? formatToDateTime(bookingData.check_in, false) : ""}
                  error={!!fieldErrors?.check_in}
                  className={`${!!fieldErrors?.check_in ? "!border-t-red-500" : "!border-t-blue-gray-200 focus:!border-t-gray-900"}`}
                  labelProps={{
                    className: "before:content-none after:content-none",
                  }}
                />
              </PopoverHandler>
              <PopoverContent className={"z-[99999]"}>
                <DayPicker
                  mode="single"
                  selected={bookingData.check_in}
                  onSelect={(d) => {
                    setIsPopoverOpen(false);
                    setBookingData(p => ({...p, check_in: d}));
                  }}
                  showOutsideDays
                  className="border-0"
                />
              </PopoverContent>
            </Popover>
            {
              fieldErrors?.status_id &&
                <Typography color="red">{fieldErrors?.status_id._errors}</Typography>
            }
          </div>
          <div>
            <label htmlFor="status_id">
              <Typography variant="h6" color="blue-gray">
                Status
              </Typography>
            </label>
            <SelectComponent<number>
              setValue={(v) => setBookingData(prevState => ({...prevState, status_id: v}))}
              options={statusDataMapped}
              selectedOption={statusDataMapped.find(r => r.value == bookingData.status_id)}
              placeholder={"Pick status"}
              isError={!!fieldErrors?.status_id}
            />
            {
              fieldErrors?.status_id &&
                <Typography color="red">{fieldErrors?.status_id._errors}</Typography>
            }
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
          <Button onClick={() => props.mutation.mutate(bookingData)} color={"blue"} className="mt-6"
                  loading={props.mutation.isPending}>
            {props.contentData ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </div>
  );
}

