"use client";

import {TableFormProps} from "@/app/_components/pageContent/TableContent";
import React, {useEffect, useMemo, useState} from "react";
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
import {formatToDateTime, generateDatesByDuration} from "@/app/_lib/util";
import "react-day-picker/style.css";
import {BookingsIncludeAll, getAllBookings} from "@/app/(internal)/bookings/booking-action";
import {DateSet} from "@/app/_lib/customSet";
import {AnimatePresence, motion, MotionConfig} from "framer-motion";

interface BookingFormProps extends TableFormProps<BookingsIncludeAll> {
}

export function BookingForm(props: BookingFormProps) {
  const [bookingData, setBookingData] = useState<Partial<BookingsIncludeAll>>(props.contentData ?? {});
  const [fieldErrors, setFieldErrors] = useState<ZodFormattedError<Booking> | undefined>(props.mutationResponse?.errors);
  const [locationID, setLocationID] = useState<number | undefined>(props.contentData?.rooms?.location_id ?? undefined);
  const today = new Date();

  const [initialBookingData, setInitialBookingData] = useState<Partial<BookingsIncludeAll>>(props.contentData ?? {});
  // Function to compare initial and current booking data
  const hasChanges = (initialData: Partial<BookingsIncludeAll>, currentData: Partial<BookingsIncludeAll>) => {
    return JSON.stringify(initialData) !== JSON.stringify(currentData);
  };

  const isButtonDisabled = useMemo(() => {
    return !bookingData.tenant_id ||
      !bookingData.room_id ||
      !bookingData.start_date ||
      !bookingData.duration_id ||
      !bookingData.fee ||
      !bookingData.status_id;

  }, [bookingData]);

  // Use effect to set initialBookingData when the component mounts
  useEffect(() => {
    setInitialBookingData(props.contentData ?? {});
  }, [props.contentData]);

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

  // Check for existing bookings
  const {
    data: existingBookings,
    isLoading: isExistingBookingLoading,
    isSuccess: isExistingBookingSuccess
  } = useQuery({
    queryKey: ['bookings', bookingData.room_id],
    queryFn: () => getAllBookings(undefined, bookingData.room_id ?? undefined),
    enabled: bookingData.room_id != undefined,
  });
  const [disabledDatesSet, setDisabledDatesSet] = useState<DateSet>(new DateSet());
  useEffect(() => {
    if (isExistingBookingSuccess) {
      const datesSet = new DateSet();
      existingBookings?.forEach(b => {
        if (b.durations) {
          generateDatesByDuration(
            b.start_date,
            b.durations,
            (d) => {
              datesSet.add(d);
            }
          );
        }
      });
      setDisabledDatesSet(datesSet);
    }
  }, [existingBookings, isExistingBookingSuccess]);

  // Disable duration options when check in date is selected
  useEffect(() => {
    if (bookingData.start_date) {
      const newDurationData = structuredClone(durationDataMapped);
      let hasChange = false;
      durationsData?.forEach((val, index) => {
        if (newDurationData[index]) {
          let dates = generateDatesByDuration(bookingData.start_date!, val);
          let inSet = disabledDatesSet.has(dates[dates.length - 1]);
          hasChange = hasChange || newDurationData[index].isDisabled != inSet;
          newDurationData[index].isDisabled = inSet;
        }
      });

      if (hasChange) {
        setDurationDataMapped([...newDurationData]);
      }
    }
  }, [bookingData.start_date, disabledDatesSet, durationDataMapped, durationsData]);

  return (
    <div className={"w-full px-8 py-4"}>
      <h1 className={"text-xl font-semibold text-black"}>{props.contentData ? "Edit" : "Create"} Booking</h1>
      <form className={"mt-4"}>
        <div className="mb-1 flex flex-col gap-6">
          <MotionConfig
            transition={{duration: 0.5}}
          >
            <AnimatePresence>
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
              {
                isExistingBookingSuccess &&
                  <motion.div
                      key={"start_date"}
                      initial={{opacity: 0, height: 0}}
                      animate={{opacity: 1, height: "auto"}}
                      exit={{opacity: 0, height: 0}}
                  >
                      <label htmlFor="start_date">
                          <Typography variant="h6" color="blue-gray">
                              Check in Date
                          </Typography>
                      </label>
                      <Popover
                          open={popoverOpen}
                          handler={() => setIsPopoverOpen(p => !p)}
                          placement="bottom-end"
                      >
                          <PopoverHandler>
                              <Input
                                  variant="outlined"
                                  size="lg"
                                  onChange={() => null}
                                  value={bookingData.start_date ? formatToDateTime(bookingData.start_date, false) : ""}
                                  error={!!fieldErrors?.start_date}
                                  className={`relative ${!!fieldErrors?.start_date ? "!border-t-red-500" : "!border-t-blue-gray-200 focus:!border-t-gray-900"}`}
                                  labelProps={{
                                    className: "before:content-none after:content-none",
                                  }}
                              />
                          </PopoverHandler>
                          <PopoverContent className={"z-[99999]"}>
                              <DayPicker
                                  captionLayout="dropdown"
                                  mode="single"
                                  fixedWeeks={true}
                                  selected={bookingData.start_date}
                                  onSelect={(d) => {
                                    setIsPopoverOpen(false);
                                    setBookingData(p => ({...p, start_date: d}));
                                  }}
                                  disabled={disabledDatesSet.values()}
                                  showOutsideDays
                                  classNames={{
                                    disabled: "rdp-disabled cursor-not-allowed",
                                  }}
                                  startMonth={new Date(today.getFullYear() - 5, today.getMonth())}
                                  endMonth={new Date(today.getFullYear() + 5, today.getMonth())}
                              />
                          </PopoverContent>
                      </Popover>
                    {
                      fieldErrors?.start_date &&
                        <Typography color="red">{fieldErrors?.start_date._errors}</Typography>
                    }
                  </motion.div>
              }
              {
                bookingData.start_date &&
                  <motion.div
                      key={"duration_id"}
                      initial={{opacity: 0, height: 0}}
                      animate={{opacity: 1, height: "auto"}}
                      exit={{opacity: 0, height: 0}}
                  >
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
                  </motion.div>
              }
              {
                bookingData.duration_id &&
                  <motion.div
                      initial={{opacity: 0, height: 0}}
                      animate={{opacity: 1, height: "auto"}}
                      exit={{opacity: 0, height: 0}}
                  >
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
                          onChange={(e) => setBookingData(prevRoom => ({
                            ...prevRoom,
                            fee: e.target.value.length > 0 ? new Prisma.Decimal(e.target.value) : undefined
                          }))}
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
                  </motion.div>
              }
              {
                bookingData.duration_id &&
                  <motion.div
                      initial={{opacity: 0, height: 0}}
                      animate={{opacity: 1, height: "auto"}}
                      exit={{opacity: 0, height: 0}}
                  >
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
                  </motion.div>
              }
              {
                props.mutationResponse?.failure &&
                  <Typography variant="h6" color="red" className="-mb-4">
                    {props.mutationResponse.failure}
                  </Typography>
              }
            </AnimatePresence>
          </MotionConfig>
        </div>

        <div className={"flex gap-x-4 justify-end"}>
          <Button onClick={() => props.setDialogOpen(false)} variant={"outlined"} className="mt-6">
            Cancel
          </Button>
          <Button disabled={isButtonDisabled || !hasChanges(initialBookingData, bookingData)}
                  onClick={() => props.mutation.mutate(bookingData)}
                  color={"blue"} className="mt-6"
                  loading={props.mutation.isPending}>
            {props.contentData ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </div>
  );
}

