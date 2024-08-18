"use client";

import {TableFormProps} from "@/app/_components/pageContent/TableContent";
import React, {useEffect, useMemo, useState} from "react";
import {Button, Input, Popover, PopoverContent, PopoverHandler, Typography} from "@material-tailwind/react";
import {useQuery} from "@tanstack/react-query";
import {SelectComponent, SelectOption} from "@/app/_components/input/select/select";
import {getLocations} from "@/app/_db/location";
import {ZodFormattedError} from "zod";
import {getTenants} from "@/app/_db/tenant";
import {DayPicker} from "react-day-picker";
import {formatToDateTime} from "@/app/_lib/util";
import "react-day-picker/style.css";
import {getAllBookingsAction} from "@/app/(internal)/bookings/booking-action";
import {AnimatePresence, motion, MotionConfig} from "framer-motion";
import {PaymentIncludeAll} from "@/app/_db/payment";
import {AiOutlineLoading} from "react-icons/ai";
import {getPaymentStatusAction} from "@/app/(internal)/payments/payment-action";
import {NonUndefined} from "@/app/_lib/types";

interface PaymentForm extends TableFormProps<PaymentIncludeAll> {
}

type DataType = Partial<NonUndefined<PaymentForm['contentData']>>;

export function PaymentForm(props: PaymentForm) {
  const [data, setData] = useState<DataType>(props.contentData ?? {});
  const [fieldErrors, setFieldErrors] = useState<ZodFormattedError<DataType> | undefined>(props.mutationResponse?.errors);
  const [locationID, setLocationID] = useState<number | undefined>(props.contentData?.bookings.rooms?.location_id ?? undefined);
  const [popoverOpen, setIsPopoverOpen] = useState(false);

  const today = new Date();

  const [initialData, setInitialData] = useState<Partial<DataType>>(props.contentData ?? {});
  // Function to compare initial and current booking data
  const hasChanges = (initialData: Partial<DataType>, currentData: Partial<DataType>) => {
    return JSON.stringify(initialData) !== JSON.stringify(currentData);
  };

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

  // Booking Data
  const {data: bookingData, isSuccess: isBookingDataSuccess} = useQuery({
    queryKey: ['bookings', 'location_id', locationID],
    queryFn: () => getAllBookingsAction(locationID),

    enabled: locationID != undefined,
  });
  const [bookingDataMapped, setBookingDataMapped] = useState<SelectOption<number>[]>([]);
  useEffect(() => {
    if (isBookingDataSuccess) {
      setBookingDataMapped(bookingData.map(r => ({
        value: r.id,
        label: `${r.id} | ${r.rooms?.room_number}`,
      })));
    }
  }, [bookingData, isBookingDataSuccess]);

  const {data: tenantData, isSuccess: tenantDataSuccess, isLoading: tenantDataIsLoading} = useQuery({
    queryKey: ['tenants'],
    queryFn: () => getTenants(),
    enabled: Boolean(data?.booking_id)
  });

  // Status Data
  const {data: statusData, isSuccess: statusDataSuccess} = useQuery({
    queryKey: ['payment.status'],
    queryFn: () => getPaymentStatusAction(),
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


  // Use effect to set initialBookingData when the component mounts
  useEffect(() => {
    setInitialData(props.contentData ?? {});
  }, [props.contentData]);

  useEffect(() => {
    setFieldErrors(props.mutationResponse?.errors);
  }, [props.mutationResponse?.errors]);

  const isButtonDisabled = useMemo(() => {
    return !data?.booking_id ||
      !data?.payment_date ||
      !data?.status_id ||
      !data?.amount ||
      !data?.payment_date ||
      !data?.payment_proof;
  }, [data]);


  return (
    <div className={"w-full px-8 py-4"}>
      <h1 className={"text-xl font-semibold text-black"}>{props.contentData ? "Edit" : "Create"} Payment</h1>
      <form className={"mt-4"}>
        <div className="mb-1 flex flex-col gap-6">
          <MotionConfig
            transition={{duration: 0.5}}
          >
            <AnimatePresence>
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
                <label htmlFor="status_id">
                  <Typography variant="h6" color="blue-gray">
                    Status
                  </Typography>
                </label>
                <SelectComponent<number>
                  setValue={(v) => setData(prevState => ({...prevState, status_id: v}))}
                  options={statusDataMapped}
                  selectedOption={statusDataMapped.find(r => r.value == data?.status_id)}
                  placeholder={"Pick status"}
                  isError={!!fieldErrors?.status_id}
                />
                {
                  fieldErrors?.status_id &&
                    <Typography color="red">{fieldErrors?.status_id._errors}</Typography>
                }
              </div>

              {
                locationID && data?.status_id &&
                  <motion.div
                      initial={{opacity: 0, height: 0}}
                      animate={{opacity: 1, height: "auto"}}
                      exit={{opacity: 0, height: 0}}
                  >
                      <label htmlFor="booking_id">
                          <Typography variant="h6" color="blue-gray">
                              Booking
                          </Typography>
                      </label>
                      <SelectComponent<number>
                          setValue={(v) => setData(prevState => ({...prevState, booking_id: v}))}
                          options={bookingDataMapped}
                          selectedOption={bookingDataMapped.find(r => r.value == data?.bookings?.id)}
                          placeholder={"Pick Booking"}
                          isError={!!fieldErrors?.booking_id}
                      />
                    {
                      fieldErrors?.booking_id &&
                        <Typography color="red">{fieldErrors?.booking_id._errors}</Typography>
                    }
                  </motion.div>

              }
              {
                data?.booking_id &&
                  <motion.div
                      initial={{opacity: 0, height: 0}}
                      animate={{opacity: 1, height: "auto"}}
                      exit={{opacity: 0, height: 0}}
                  >
                      <label htmlFor="tenant_id">
                          <Typography variant="h6" color="blue-gray">
                              Tenant
                          </Typography>
                      </label>
                    {
                      tenantDataIsLoading &&
                        <div className={"flex items-center justify-center"}>
                            <AiOutlineLoading size={"3rem"} className={"animate-spin my-8"}/>
                        </div>
                    }
                    {
                      tenantDataSuccess &&
                        <Input
                            value={
                              tenantData?.find(r => r.id == data?.bookings?.tenant_id)?.name
                            }
                            disabled={true}
                            size="lg"
                            className={"!border-t-blue-gray-200 focus:!border-t-gray-900"}
                            labelProps={{
                              className: "before:content-none after:content-none",
                            }}
                        />
                    }
                  </motion.div>
              }
              {
                data?.booking_id &&
                  <motion.div
                      key={"start_date"}
                      initial={{opacity: 0, height: 0}}
                      animate={{opacity: 1, height: "auto"}}
                      exit={{opacity: 0, height: 0}}
                  >
                      <label htmlFor="payment_date">
                          <Typography variant="h6" color="blue-gray">
                              Payment Date
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
                                  value={data.payment_date ? formatToDateTime(data.payment_date, true) : ""}
                                  error={!!fieldErrors?.payment_date}
                                  className={`relative ${!!fieldErrors?.payment_date ? "!border-t-red-500" : "!border-t-blue-gray-200 focus:!border-t-gray-900"}`}
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
                                  selected={data.payment_date ? data.payment_date : new Date()}
                                  onSelect={(d) => {
                                    setIsPopoverOpen(false);
                                    setData(p => ({...p, payment_date: d}));
                                  }}
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
                      fieldErrors?.payment_date &&
                        <Typography color="red">{fieldErrors?.payment_date._errors}</Typography>
                    }
                  </motion.div>
              }
              {
                data?.payment_date &&
                  <></> // TODO! File Upload
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
          <Button disabled={isButtonDisabled || !hasChanges(initialData, data)}
                  onClick={() => props.mutation.mutate(data)}
                  color={"blue"} className="mt-6"
                  loading={props.mutation.isPending}>
            {props.contentData ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </div>
  );
}

