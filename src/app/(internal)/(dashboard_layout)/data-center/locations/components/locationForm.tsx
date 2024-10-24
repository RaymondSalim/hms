import {Location} from "@prisma/client";
import {useState} from "react";
import {Button, Input, Textarea, Typography} from "@material-tailwind/react";
import {UseMutationResult} from "@tanstack/react-query";
import {LocationActionsType} from "@/app/(internal)/(dashboard_layout)/data-center/locations/location-action";

export interface LocationFormProps {
  location?: Location
  setDialogOpen: (open: boolean) => void
  mutation: UseMutationResult<LocationActionsType, Error, Partial<Location>, unknown>
}

export function LocationForm({location, setDialogOpen, mutation}: LocationFormProps) {
  const [locationData, setLocationData] = useState<Partial<Location>>(location ?? {});

  return (
    <div className={"w-full px-8 py-4"}>
      <h1 className={"text-xl font-semibold text-black"}>{location ? "Perubahan" : "Pembuatan"} Lokasi</h1>
      <form className={"mt-4"}>
        <div className="mb-1 flex flex-col gap-6">
          <Typography variant="h6" color="blue-gray" className="-mb-4">
            Nama
          </Typography>
          <Input
            value={locationData.name}
            onChange={(e) => setLocationData(prevLocationData => ({...prevLocationData, name: e.target.value}))}
            size="lg"
            placeholder="House 1"
            className=" !border-t-blue-gray-200 focus:!border-t-gray-900"
            labelProps={{
              className: "before:content-none after:content-none",
            }}
          />
          <Typography variant="h6" color="blue-gray" className="-mb-4">
            Alamat
          </Typography>
          <Textarea
            value={locationData.address}
            onChange={(e) => setLocationData(prevLocationData => ({...prevLocationData, address: e.target.value}))}
            size="lg"
            placeholder="142 Tess Harbor"
            className=" !border-t-blue-gray-200 focus:!border-t-gray-900"
            labelProps={{
              className: "before:content-none after:content-none",
            }}
          />
        </div>
        <div className={"flex gap-x-4 justify-end"}>
          <Button onClick={() => setDialogOpen(false)} variant={"outlined"} className="mt-6">
            Batal
          </Button>
          <Button onClick={() => mutation.mutate(locationData)} color={"blue"} className="mt-6"
                  loading={mutation.isPending}>
            {location ? "Ubah" : "Buat"}
          </Button>
        </div>

      </form>
    </div>
  );
}
