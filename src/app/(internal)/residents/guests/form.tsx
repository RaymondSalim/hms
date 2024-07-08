"use client";

import {TableFormProps} from "@/app/_components/pageContent/TableContent";
import {Guest} from "@prisma/client";
import React, {useState} from "react";
import {Button, Input, Typography} from "@material-tailwind/react";
import {GuestWithTenant} from "@/app/_db/guest";
import {PhoneInput} from "@/app/_components/input/phone/phoneInput";

interface GuestFormProps extends TableFormProps<GuestWithTenant> {
}

export function GuestForm(props: GuestFormProps) {
  const [guestData, setGuestData] = useState<Partial<Guest>>(props.contentData ?? {});

  const fieldErrors = {
    ...props.mutationResponse?.errors?.fieldErrors
  };

  return (
    <div className={"w-full px-8 py-4"}>
      <h1 className={"text-xl font-semibold text-black"}>{props.contentData ? "Edit" : "Create"} Guest</h1>
      <form className={"mt-4"}>
        <div className="mb-1 flex flex-col gap-6">
          <div>
            <label htmlFor="name">
              <Typography variant="h6" color="blue-gray">
                Name
              </Typography>
            </label>
            <Input
              variant="outlined"
              name="name"
              value={guestData.name}
              onChange={(e) => setGuestData(prevGuest => ({...prevGuest, name: e.target.value}))}
              size="lg"
              placeholder="John Smith"
              error={!!fieldErrors.name}
              className={`${!!fieldErrors.name ? "!border-t-red-500" : "!border-t-blue-gray-200 focus:!border-t-gray-900"}`}
              labelProps={{
                className: "before:content-none after:content-none",
              }}
            />
            {
              fieldErrors.name &&
                <Typography color="red">{fieldErrors.name}</Typography>
            }
          </div>
          <div>
            <label htmlFor="email">
              <Typography variant="h6" color="blue-gray">
                Email
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
              error={!!fieldErrors.email}
              className={`${!!fieldErrors.email ? "!border-t-red-500" : "!border-t-blue-gray-200 focus:!border-t-gray-900"}`}
              labelProps={{
                className: "before:content-none after:content-none",
              }}
            />
          </div>
          <div>
            <label htmlFor="phone">
              <Typography variant="h6" color="blue-gray">
                Phone
              </Typography>
            </label>
            <PhoneInput
              setPhoneNumber={(p) => setGuestData(prevGuest => ({...prevGuest, phone: p}))}
              type="tel"
              placeholder="Mobile Number"
              error={!!fieldErrors.phone}
              className={`${!!fieldErrors.phone ? "!border-t-red-500" : "!border-t-blue-gray-200 focus:!border-t-gray-900"}`}
              labelProps={{
                className: "before:content-none after:content-none",
              }}
              containerProps={{
                className: "min-w-0",
              }}
            />
          </div>
          {/*TODO!*/}
          {/*<div>*/}
          {/*    <label htmlFor="tenant">*/}
          {/*        <Typography variant="h6" color="blue-gray">*/}
          {/*            Tenant*/}
          {/*        </Typography>*/}
          {/*    </label>*/}
          {/*    <Input*/}
          {/*        variant="outlined"*/}
          {/*        name="password"*/}
          {/*        type={"password"}*/}
          {/*        value={guestData.tenant_id}*/}
          {/*        onChange={(e) => setGuestData(prevGuest => ({...prevGuest, tenant_id: e.target.value}))}*/}
          {/*        size="lg"*/}
          {/*        error={!!fieldErrors.password}*/}
          {/*        className={`${!!fieldErrors.password ? "!border-t-red-500" : "!border-t-blue-gray-200 focus:!border-t-gray-900"}`}*/}
          {/*        labelProps={{*/}
          {/*          className: "before:content-none after:content-none",*/}
          {/*        }}*/}
          {/*    />*/}
          {/*</div>*/}
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
          <Button onClick={() => props.mutation.mutate(guestData)} color={"blue"} className="mt-6"
                  loading={props.mutation.isPending}>
            {props.contentData ? "Update" : "Create"}
          </Button>
        </div>

      </form>
    </div>
  );
}
