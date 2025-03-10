"use client";

import {TableFormProps} from "@/app/_components/pageContent/TableContent";
import {Guest} from "@prisma/client";
import React, {useEffect, useState} from "react";
import {Button, Input, Typography} from "@material-tailwind/react";
import {GuestIncludeAll} from "@/app/_db/guest";
import {PhoneInput} from "@/app/_components/input/phoneInput";
import {useQuery} from "@tanstack/react-query";
import {ZodFormattedError} from "zod";
import {SelectComponent, SelectOption} from "@/app/_components/input/select";
import {getAllBookingsAction} from "@/app/(internal)/(dashboard_layout)/bookings/booking-action";
import {formatToDateTime} from "@/app/_lib/util";

interface GuestFormProps extends TableFormProps<GuestIncludeAll> {
}

export function GuestForm(props: GuestFormProps) {
  const [guestData, setGuestData] = useState<Partial<Guest>>(props.contentData ?? {});
  const [fieldErrors, setFieldErrors] = useState<ZodFormattedError<GuestIncludeAll> | undefined>(props.mutationResponse?.errors);

  // Tenant Data
  const {data: bookingData, isSuccess: bookingDataSuccess} = useQuery({
    queryKey: ['booking'],
    queryFn: () => getAllBookingsAction(),
  });
  const [bookingDataMapped, setBookingDataMapped] = useState<SelectOption<number>[]>([]);
  useEffect(() => {
    if (bookingDataSuccess) {
      setBookingDataMapped(bookingData.map(e => ({
        value: e.id,
        label: `#-${e.id} | ${formatToDateTime(e.start_date, false)} - ${formatToDateTime(e.end_date, false)}`,
      })));
    }
  }, [bookingData, bookingDataSuccess]);

  useEffect(() => {
    setFieldErrors(props.mutationResponse?.errors);
  }, [props.mutationResponse?.errors]);

  return (
    <div className={"w-full px-8 py-4"}>
      <h1 className={"text-xl font-semibold text-black"}>{props.contentData ? "Perubahan" : "Pembuatan"} Tamu</h1>
      <form className={"mt-4"}>
        <div className="mb-1 flex flex-col gap-6">
          <div>
            <label htmlFor="name">
              <Typography variant="h6" color="blue-gray">
                Nama
              </Typography>
            </label>
            <Input
                variant="outlined"
                name="name"
                value={guestData.name}
                onChange={(e) => setGuestData(prevGuest => ({...prevGuest, name: e.target.value}))}
                size="lg"
                placeholder="John Smith"
                error={!!fieldErrors?.name}
                className={`${!!fieldErrors?.name ? "!border-t-red-500" : "!border-t-blue-gray-200 focus:!border-t-gray-900"}`}
                labelProps={{
                  className: "before:content-none after:content-none",
                }}
            />
            {
                fieldErrors?.name &&
                <Typography color="red">{fieldErrors?.name._errors}</Typography>
            }
          </div>
          <div>
            <label htmlFor="email">
              <Typography variant="h6" color="blue-gray">
                Alamat Email
              </Typography>
            </label>
            <Input
                variant="outlined"
                name="email"
                type={"email"}
                // @ts-ignore
                value={guestData.email}
                onChange={(e) => setGuestData(prevGuest => ({...prevGuest, email: e.target.value}))}
                size="lg"
                placeholder="john@smith.com"
                error={!!fieldErrors?.email}
                className={`${!!fieldErrors?.email ? "!border-t-red-500" : "!border-t-blue-gray-200 focus:!border-t-gray-900"}`}
                labelProps={{
                  className: "before:content-none after:content-none",
                }}
            />
            {
                fieldErrors?.email &&
                <Typography color="red">{fieldErrors?.email._errors}</Typography>
            }
          </div>
          <div>
            <label htmlFor="phone">
              <Typography variant="h6" color="blue-gray">
                Nomor Telepon
              </Typography>
            </label>
            <PhoneInput
                phoneNumber={guestData.phone}
                setPhoneNumber={(p) => setGuestData(prevGuest => ({...prevGuest, phone: p}))}
                type="tel"
                placeholder="Mobile Number"
                error={!!fieldErrors?.phone}
                className={`${!!fieldErrors?.phone ? "!border-t-red-500" : "!border-t-blue-gray-200 focus:!border-t-gray-900"}`}
                labelProps={{
                  className: "before:content-none after:content-none",
                }}
                containerProps={{
                  className: "min-w-0",
                }}
            />
            {
                fieldErrors?.phone &&
                <Typography color="red">{fieldErrors?.phone._errors}</Typography>
            }
          </div>
          <div>
            <label htmlFor="booking_id">
              <Typography variant="h6" color="blue-gray">
                Tamu dari Pemesanan
              </Typography>
            </label>
            <SelectComponent<number>
                setValue={(v) => setGuestData(prev => ({...prev, booking_id: v}))}
                options={bookingDataMapped}
                selectedOption={
                  bookingDataMapped.find(r => r.value == guestData.booking_id)
                }
                placeholder={"Pilih pemesanan"}
                isError={!!fieldErrors?.booking_id}
            />
            {
                fieldErrors?.booking_id &&
                <Typography color="red">{fieldErrors?.booking_id._errors}</Typography>
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
            Batal
          </Button>
          <Button onClick={() => props.mutation.mutate(guestData)} color={"blue"} className="mt-6"
                  loading={props.mutation.isPending}>
            {props.contentData ? "Ubah" : "Buat"}
          </Button>
        </div>

      </form>
    </div>
  );
}
