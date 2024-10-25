"use client";

import {TableFormProps} from "@/app/_components/pageContent/TableContent";
import {Guest} from "@prisma/client";
import React, {useEffect, useState} from "react";
import {Button, Input, Typography} from "@material-tailwind/react";
import {GuestWithTenant} from "@/app/_db/guest";
import {PhoneInput} from "@/app/_components/input/phone/phoneInput";
import {useQuery} from "@tanstack/react-query";
import {getTenants} from "@/app/_db/tenant";
import AsyncSelect from "react-select/async";
import {ZodFormattedError} from "zod";
import {SelectComponent, SelectOption} from "@/app/_components/input/select/select";

interface GuestFormProps extends TableFormProps<GuestWithTenant> {
}

export function GuestForm(props: GuestFormProps) {
  const [guestData, setGuestData] = useState<Partial<Guest>>(props.contentData ?? {});
  const [fieldErrors, setFieldErrors] = useState<ZodFormattedError<GuestWithTenant> | undefined>(props.mutationResponse?.errors);

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
          {/*<div>*/}
          {/*  <label htmlFor="tenant">*/}
          {/*    <Typography variant="h6" color="blue-gray">*/}
          {/*      Tamu Dari*/}
          {/*    </Typography>*/}
          {/*  </label>*/}
          {/*  <TenantSelect tenantId={guestData.tenant_id}*/}
          {/*                setTenantId={(v) => setGuestData(prevGuest => ({...prevGuest, tenant_id: v}))}/>*/}
          {/*  {*/}
          {/*      fieldErrors?.tenant_id &&*/}
          {/*      <Typography color="red">{fieldErrors?.tenant_id._errors}</Typography>*/}
          {/*  }*/}
          {/*</div>*/}
          <div>
            <label htmlFor="tenant_id">
              <Typography variant="h6" color="blue-gray">
                Penyewa
              </Typography>
            </label>
            <SelectComponent<string>
                setValue={(v) => setGuestData(prev => ({...prev, tenant_id: v}))}
                options={tenantDataMapped}
                selectedOption={
                  tenantDataMapped.find(r => r.value == guestData.tenant_id)
                }
                placeholder={"Pick Tenant"}
                isError={!!fieldErrors?.tenant_id}
            />
            {
                fieldErrors?.tenant_id &&
                <Typography color="red">{fieldErrors?.tenant_id._errors}</Typography>
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

type Option = {
  value: string,
  label: string,
  name: string,
}

interface TenantSelectProps {
  tenantId?: string
  setTenantId: (value?: string) => void;
}

export function TenantSelect(props: TenantSelectProps) {
  const [initialValue, setInitialValue] = useState<Option | null>(null);
  const [options, setOptions] = useState<Option[]>([]);

  const {data, isLoading, isSuccess} = useQuery({
    queryKey: ['tenant.select'],
    queryFn: () => getTenants(),
  });

  const loadOptions = (
    inputValue: string,
    callback: (options: Option[]) => void
  ) => {
    if (isSuccess) {
      if (inputValue.length <= 2) {
        callback(options);
        return;
      }

      let filtered = options?.filter(o => (
        o.name.toLowerCase().includes(inputValue.toLowerCase())
      ));

      callback(filtered);
    }
  };

  useEffect(() => {
    if (props.tenantId) {
      let initial = options.find(o => o.value == props.tenantId);
      setInitialValue(initial ?? null);
    }
  }, [options]);

  useEffect(() => {
    if (isSuccess) {
      let options = data?.map(t => ({
        value: t.id,
        label: t.name + ` | ${t.phone}`,
        name: t.name,
      }));

      setOptions(options);
    }
  }, [data, isSuccess]);

  return (
    <AsyncSelect
      onChange={(n) => {
        setInitialValue(n);
        props.setTenantId(n?.value);
      }}
      isLoading={isLoading}
      isClearable={true}
      cacheOptions
      loadOptions={loadOptions}
      value={initialValue}
      placeholder={"Masukan Nama Tenant"}
    />
  );
}
