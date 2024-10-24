"use client";

import {TableFormProps} from "@/app/_components/pageContent/TableContent";
import {Tenant} from "@prisma/client";
import React, {useEffect, useState} from "react";
import {Button, Input, Typography} from "@material-tailwind/react";
import {TenantWithRooms} from "@/app/_db/tenant";
import {PhoneInput} from "@/app/_components/input/phone/phoneInput";
import {ZodFormattedError} from "zod";

interface TenantFormProps extends TableFormProps<TenantWithRooms> {
}

export function TenantForm(props: TenantFormProps) {
  const [tenantData, setTenantData] = useState<Partial<Tenant>>(props.contentData ?? {});
  const [fieldErrors, setFieldErrors] = useState<ZodFormattedError<TenantWithRooms> | undefined>(props.mutationResponse?.errors);

  useEffect(() => {
    setFieldErrors(props.mutationResponse?.errors);
  }, [props.mutationResponse?.errors]);

  return (
    <div className={"w-full px-8 py-4"}>
      <h1 className={"text-xl font-semibold text-black"}>{props.contentData ? "Perubahan" : "Pembuatan"} Penyewa</h1>
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
              value={tenantData.name}
              onChange={(e) => setTenantData(prevTenant => ({...prevTenant, name: e.target.value}))}
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
              value={tenantData.email}
              onChange={(e) => setTenantData(prevTenant => ({...prevTenant, email: e.target.value}))}
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
              phoneNumber={tenantData.phone}
              setPhoneNumber={(p) => setTenantData(prevTenant => ({...prevTenant, phone: p}))}
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
          <Button onClick={() => props.mutation.mutate(tenantData)} color={"blue"} className="mt-6"
                  loading={props.mutation.isPending}>
            {props.contentData ? "Ubah" : "Buat"}
          </Button>
        </div>

      </form>
    </div>
  );
}
