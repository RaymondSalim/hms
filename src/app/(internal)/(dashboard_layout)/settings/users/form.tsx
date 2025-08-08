"use client";

import {TableFormProps} from "@/app/_components/pageContent/TableContent";
import {SiteUser} from "@prisma/client";
import React, {useEffect, useState} from "react";
import {Button, Input, Option, Select, Typography} from "@material-tailwind/react";
import {useQuery} from "@tanstack/react-query";
import {getAllRoles} from "@/app/_db/user";
import {AiOutlineLoading} from "react-icons/ai";
import {ZodFormattedError} from "zod";

interface UserFormProps extends TableFormProps<SiteUser> {
}

export function UserForm(props: UserFormProps) {
  const [userData, setUserData] = useState<Partial<SiteUser>>(props.contentData ?? {});

  const {data: roles, isLoading, isSuccess} = useQuery({
    queryKey: ['user.roles'],
    queryFn: () => getAllRoles()
  });
  const [fieldErrors, setFieldErrors] = useState<ZodFormattedError<SiteUser> | undefined>(props.mutationResponse?.errors);

  useEffect(() => {
    setFieldErrors(props.mutationResponse?.errors);
  }, [props.mutationResponse?.errors]);

  return (
    <div className={"w-full px-8 py-4"}>
      <h1 className={"text-xl font-semibold text-black"}>{(props.contentData && props.contentData.id) ? "Perubahan" : "Pembuatan"} User</h1>
      <form className={"mt-4"}>
        <div className="mb-1 flex flex-col gap-6">
          <div>
            <label htmlFor="name">
              {/* @ts-expect-error weird react 19 types error */}
              <Typography variant="h6" color="blue-gray">
                Nama
              </Typography>
            </label>
            {/* @ts-expect-error weird react 19 types error */}
            <Input
              variant="outlined"
              name="name"
              value={userData.name}
              onChange={(e) => setUserData(prevUser => ({...prevUser, name: e.target.value}))}
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
                 // @ts-expect-error weird react 19 types error
                <Typography color="red">{fieldErrors?.name._errors}</Typography>
            }
          </div>
          <div>
            <label htmlFor="email">
              {/* @ts-expect-error weird react 19 types error */}
              <Typography variant="h6" color="blue-gray">
                Alamat Email
              </Typography>
            </label>
            {/* @ts-expect-error weird react 19 types error */}
            <Input
              variant="outlined"
              name="email"
              type={"email"}
              value={userData.email}
              onChange={(e) => setUserData(prevUser => ({...prevUser, email: e.target.value}))}
              size="lg"
              placeholder="john@smith.com"
              error={!!fieldErrors?.email}
              className={`${!!fieldErrors?.email ? "!border-t-red-500" : "!border-t-blue-gray-200 focus:!border-t-gray-900"}`}
              labelProps={{
                className: "before:content-none after:content-none",
              }}
            />
          </div>
          {
            isLoading && <div className={"w-full flex items-center justify-center"}>
                  <AiOutlineLoading size={"3rem"} className={"animate-spin my-8"}/>
              </div>
          }
          {
            isSuccess &&
              <div>
                  <label htmlFor="role">
                      {/* @ts-expect-error weird react 19 types error */}
                      <Typography variant="h6" color="blue-gray">
                          Peran
                      </Typography>
                  </label>
                  {/* @ts-expect-error weird react 19 types error */}
                  <Select
                      value={userData.role_id?.toString()}
                      name="role"
                      onChange={(value) => setUserData({...userData, role_id: Number(value) || undefined})}
                      error={!!fieldErrors?.role_id}
                      className={`${!!fieldErrors?.role_id ? "!border-t-red-500" : "!border-t-blue-gray-200 aria-expanded:!border-t-gray-900"}`}
                      labelProps={{
                        className: "before:content-none after:content-none",
                      }}
                  >
                    {
                      roles?.map(r => <Option value={r.id.toString()} key={r.id}>{r.name}</Option>)
                    }
                  </Select>
              </div>
          }
          {
            props.contentData == undefined &&
              <div>
                  <label htmlFor="password">
                      {/* @ts-expect-error weird react 19 types error */}
                      <Typography variant="h6" color="blue-gray">
                          Kata Sandi
                      </Typography>
                  </label>
                  {/* @ts-expect-error weird react 19 types error */}
                  <Input
                      variant="outlined"
                      name="password"
                      type={"password"}
                      value={userData.password}
                      onChange={(e) => setUserData(prevUser => ({...prevUser, password: e.target.value}))}
                      size="lg"
                      placeholder="********"
                      error={!!fieldErrors?.password}
                      className={`${!!fieldErrors?.password ? "!border-t-red-500" : "!border-t-blue-gray-200 focus:!border-t-gray-900"}`}
                      labelProps={{
                        className: "before:content-none after:content-none",
                      }}
                  />
              </div>
          }
          {
            props.mutationResponse?.failure &&
               // @ts-expect-error weird react 19 types error
              <Typography variant="h6" color="blue-gray" className="-mb-4">
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
          <Button onClick={() => props.mutation.mutate(userData)} color={"blue"} className="mt-6"
                  loading={props.mutation.isPending}>
            {(props.contentData && props.contentData.id) ? "Ubah" : "Buat"}
          </Button>
        </div>

      </form>
    </div>
  );
}
