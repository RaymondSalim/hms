"use client";

import {TableFormProps} from "@/app/_components/pageContent/TableContent";
import {MaintenanceTask} from "@prisma/client";
import React, {useEffect, useState} from "react";
import {Button, Input, Textarea, Select, Option, Typography} from "@material-tailwind/react";
import {ZodFormattedError} from "zod";

interface MaintenanceFormProps extends TableFormProps<MaintenanceTask> {}

const statusOptions = [
  { value: "PENDING", label: "Pending" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
];

export function MaintenanceForm(props: MaintenanceFormProps) {
  const [taskData, setTaskData] = useState<Partial<MaintenanceTask>>(props.contentData ?? {});
  const [fieldErrors, setFieldErrors] = useState<ZodFormattedError<MaintenanceTask> | undefined>(props.mutationResponse?.errors);

  useEffect(() => {
    setFieldErrors(props.mutationResponse?.errors);
  }, [props.mutationResponse?.errors]);

  return (
    <div className="w-full px-8 py-4">
      <h1 className="text-xl font-semibold text-black">{(props.contentData && props.contentData.id) ? "Perubahan" : "Pembuatan"} Tugas</h1>
      <div className="mt-4">
        <div className="mb-1 flex flex-col gap-6">
          {taskData.id && (
            <div>
              <label htmlFor="id">
                <Typography variant="h6" color="blue-gray">ID</Typography>
              </label>
              <Input disabled variant="outlined" value={taskData.id} size="lg" labelProps={{className: "before:content-none after:content-none"}} />
            </div>
          )}
          <div>
            <label htmlFor="title">
              <Typography variant="h6" color="blue-gray">Judul</Typography>
            </label>
            <Input variant="outlined" value={taskData.title ?? ""} onChange={e => setTaskData(p => ({...p, title: e.target.value}))} size="lg" error={!!fieldErrors?.title} className={`${fieldErrors?.title ? "!border-t-red-500" : "!border-t-blue-gray-200 focus:!border-t-gray-900"}`} labelProps={{className: "before:content-none after:content-none"}} />
          </div>
          <div>
            <label htmlFor="description">
              <Typography variant="h6" color="blue-gray">Deskripsi</Typography>
            </label>
            <Textarea value={taskData.description ?? ""} onChange={e => setTaskData(p => ({...p, description: e.target.value}))} labelProps={{className: "before:content-none after:content-none"}} />
          </div>
          <div>
            <label htmlFor="status">
              <Typography variant="h6" color="blue-gray">Status</Typography>
            </label>
            <Select value={taskData.status ?? "PENDING"} onChange={val => setTaskData(p => ({...p, status: val!}))}>
              {statusOptions.map(opt => <Option key={opt.value} value={opt.value}>{opt.label}</Option>)}
            </Select>
          </div>
          <div>
            <label htmlFor="due_date">
              <Typography variant="h6" color="blue-gray">Tanggal Jatuh Tempo</Typography>
            </label>
            <Input type="date" value={taskData.due_date ? new Date(taskData.due_date).toISOString().split('T')[0] : ''} onChange={e => setTaskData(p => ({...p, due_date: new Date(e.target.value)}))} variant="outlined" size="lg" labelProps={{className: "before:content-none after:content-none"}} />
          </div>
          <div>
            <label htmlFor="room_id">
              <Typography variant="h6" color="blue-gray">ID Kamar (Opsional)</Typography>
            </label>
            <Input type="number" value={taskData.room_id ?? ''} onChange={e => setTaskData(p => ({...p, room_id: e.target.value ? Number(e.target.value) : undefined}))} variant="outlined" size="lg" labelProps={{className: "before:content-none after:content-none"}} />
          </div>
          <div>
            <label htmlFor="location_id">
              <Typography variant="h6" color="blue-gray">ID Lokasi</Typography>
            </label>
            <Input type="number" value={taskData.location_id ?? ''} onChange={e => setTaskData(p => ({...p, location_id: Number(e.target.value)}))} variant="outlined" size="lg" labelProps={{className: "before:content-none after:content-none"}} />
          </div>
          {props.mutationResponse?.failure && (
            <Typography variant="h6" color="red" className="-mb-4">{props.mutationResponse.failure}</Typography>
          )}
        </div>
        <div className="flex gap-x-4 justify-end">
          <Button onClick={() => props.setDialogOpen(false)} variant="outlined" className="mt-6">Batal</Button>
          <Button onClick={() => props.mutation.mutate(taskData)} color="blue" className="mt-6" loading={props.mutation.isPending}>{(props.contentData && props.contentData.id) ? "Ubah" : "Buat"}</Button>
        </div>
      </div>
    </div>
  );
}
