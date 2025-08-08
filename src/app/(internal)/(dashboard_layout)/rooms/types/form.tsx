"use client";

import {TableFormProps} from "@/app/_components/pageContent/TableContent";
import {RoomType} from "@prisma/client";
import React, {useEffect, useState} from "react";
import {Button, Input, Typography} from "@material-tailwind/react";
import {ZodFormattedError} from "zod";

interface RoomFormProps extends TableFormProps<RoomType> {
}

export function RoomTypesForm(props: RoomFormProps) {
  const [roomTypeData, setRoomTypeData] = useState<Partial<RoomType>>(props.contentData ?? {});
  const [fieldErrors, setFieldErrors] = useState<ZodFormattedError<RoomType> | undefined>(props.mutationResponse?.errors);

  useEffect(() => {
    setFieldErrors(props.mutationResponse?.errors);
  }, [props.mutationResponse?.errors]);

  return (
    <div className={"w-full px-8 py-4"}>
      <h1 className={"text-xl font-semibold text-black"}>{(props.contentData && props.contentData.id) ? "Perubahan" : "Pembuatan"} Tipe Kamar</h1>
      <div className={"mt-4"}>
        <div className="mb-1 flex flex-col gap-6">
          {
              roomTypeData.id &&
              <div>
                <label htmlFor="room_number">
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
              {/* @ts-expect-error weird react 19 types error */}
              <Typography variant="h6" color="blue-gray">
                Tipe Kamar
              </Typography>
            </label>
            {/* @ts-expect-error weird react 19 types error */}
            <Input
                variant="outlined"
                name="type"
                value={roomTypeData.type}
                onChange={(e) => setRoomTypeData(prevRoomType => ({...prevRoomType, type: e.target.value}))}
                size="lg"
                placeholder="Presidential"
                error={!!fieldErrors?.type}
                className={`${!!fieldErrors?.type ? "!border-t-red-500" : "!border-t-blue-gray-200 focus:!border-t-gray-900"}`}
                labelProps={{
                  className: "before:content-none after:content-none",
                }}
            />
          </div>
          <div>
            <label htmlFor="description">
              {/* @ts-expect-error weird react 19 types error */}
              <Typography variant="h6" color="blue-gray">
                Deskripsi
              </Typography>
            </label>
            {/* @ts-expect-error weird react 19 types error */}
            <Input
                variant="outlined"
                name="description"
                value={roomTypeData.description ?? ""}
                onChange={(e) => setRoomTypeData(prevRoomType => ({...prevRoomType, description: e.target.value}))}
                size="lg"
                error={!!fieldErrors?.description}
                className={`${!!fieldErrors?.description ? "!border-t-red-500" : "!border-t-blue-gray-200 focus:!border-t-gray-900"}`}
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
          <Button onClick={() => props.mutation.mutate(roomTypeData)} color={"blue"} className="mt-6"
                  loading={props.mutation.isPending}>
            {(props.contentData && props.contentData.id) ? "Ubah" : "Buat"}
          </Button>
        </div>
      </div>
    </div>
  );
}

