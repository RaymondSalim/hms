"use client";

import {TableFormProps} from "@/app/_components/pageContent/TableContent";
import {Duration} from "@prisma/client";
import React, {useEffect, useState} from "react";
import {Button, Input, Typography} from "@material-tailwind/react";
import {ZodFormattedError} from "zod";

interface RoomFormProps extends TableFormProps<Duration> {
}

export function DurationForm(props: RoomFormProps) {
  const [durationData, setDurationData] = useState<Partial<Duration>>(props.contentData ?? {});
  const [fieldErrors, setFieldErrors] = useState<ZodFormattedError<Duration> | undefined>(props.mutationResponse?.errors);

  useEffect(() => {
    setFieldErrors(props.mutationResponse?.errors);
  }, [props.mutationResponse?.errors]);

  return (
    <div className={"w-full px-8 py-4"}>
      <h1 className={"text-xl font-semibold text-black"}>{(props.contentData && props.contentData.id) ? "Perubahan" : "Pembuatan"} Durasi</h1>
      <div className={"mt-4"}>
        <div className="mb-1 flex flex-col gap-6">
          {
            durationData.id &&
              <div>
                  <label htmlFor="id">
                      {/* @ts-expect-error weird react 19 types error */}
                      <Typography variant="h6" color="blue-gray">
                          ID
                      </Typography>
                  </label>
                  {/* @ts-expect-error weird react 19 types error */}
                  <Input
                      disabled={true}
                      variant="outlined"
                      name="room_number"
                      value={durationData.id}
                      size="lg"
                      className={"!border-t-blue-gray-200 focus:!border-t-gray-900"}
                      labelProps={{
                        className: "before:content-none after:content-none",
                      }}
                  />
              </div>
          }
          <div>
            <label htmlFor="duration">
              {/* @ts-expect-error weird react 19 types error */}
              <Typography variant="h6" color="blue-gray">
                Nama Durasi
              </Typography>
            </label>
            {/* @ts-expect-error weird react 19 types error */}
            <Input
              variant="outlined"
              name="duration"
              value={durationData.duration}
              onChange={(e) => setDurationData(prevDuration => ({...prevDuration, duration: e.target.value}))}
              size="lg"
              placeholder="1 Tahun"
              error={!!fieldErrors?.duration}
              className={`${!!fieldErrors?.duration ? "!border-t-red-500" : "!border-t-blue-gray-200 focus:!border-t-gray-900"}`}
              labelProps={{
                className: "before:content-none after:content-none",
              }}
            />
          </div>
          <div>
            <label htmlFor="month_count">
              {/* @ts-expect-error weird react 19 types error */}
              <Typography variant="h6" color="blue-gray">
                Jumlah Bulan
              </Typography>
            </label>
            {/* @ts-expect-error weird react 19 types error */}
            <Input
              min="0" onInput={({currentTarget}) => currentTarget.validity.valid || currentTarget.value == ''}
              type="number"
              variant="outlined"
              name="month_count"
              value={durationData.month_count ?? undefined}
              onChange={(e) => setDurationData(prevDuration => ({
                ...prevDuration,
                month_count: Number(e.target.value)
              }))}
              size="lg"
              placeholder="15"
              error={!!fieldErrors?.month_count}
              className={`${!!fieldErrors?.month_count ? "!border-t-red-500" : "!border-t-blue-gray-200 focus:!border-t-gray-900"}`}
              labelProps={{
                className: "before:content-none after:content-none",
              }}
            />
          </div>
          {
            props.mutationResponse?.failure &&
               // @ts-expect-error weird react 19 types error
              <Typography variant="h6" color="red" className="-mb-4">
                {props.mutationResponse.failure}
              </Typography>
          }
        </div>

        <div className={"flex gap-x-4 justify-end"}>
          {/* @ts-expect-error weird react 19 types error */}
          <Button onClick={() => props.setDialogOpen(false)} variant={"outlined"} className="mt-6">
            Batal
          </Button>
          {/* @ts-expect-error weird react 19 types error */}
          <Button onClick={() => props.mutation.mutate(durationData)} color={"blue"} className="mt-6"
                  loading={props.mutation.isPending}>
            {(props.contentData && props.contentData.id) ? "Ubah" : "Buat"}
          </Button>
        </div>
      </div>
    </div>
  );
}

