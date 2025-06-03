import {Location} from "@prisma/client";
import {useState} from "react";
import {Button, Input, Textarea, Typography} from "@material-tailwind/react";
import {AnimatePresence, motion, MotionConfig} from "framer-motion";
import {ZodFormattedError} from "zod";
import {TableFormProps} from "@/app/_components/pageContent/TableContent";

export interface LocationFormProps extends TableFormProps<Location> {
}

export function LocationForm({contentData: location, setDialogOpen, mutation, mutationResponse}: LocationFormProps) {
  const [locationData, setLocationData] = useState<Partial<Location>>(location ?? {});
  const [fieldErrors, setFieldErrors] = useState<ZodFormattedError<Partial<Location>> | undefined>(mutationResponse?.errors);

  const [initialLocationData, setInitialLocationData] = useState<Partial<Location>>(location ?? {});

  // Function to compare initial and current location data
  const hasChanges = (initialData: Partial<Location>, currentData: Partial<Location>) => {
    return JSON.stringify(initialData) !== JSON.stringify(currentData);
  };

  const isButtonDisabled = !locationData.name || !locationData.address;

  return (
    <div className={"w-full px-8 py-4"}>
      <h1 className={"text-xl font-semibold text-black"}>{(location && location.id) ? "Perubahan" : "Pembuatan"} Lokasi</h1>
      <form className={"mt-4"}>
        <div className="mb-1 flex flex-col gap-6">
          <MotionConfig
            transition={{duration: 0.5}}
          >
            <AnimatePresence key={"location_form"}>
              <motion.div
                initial={{opacity: 0, height: 0}}
                animate={{opacity: 1, height: "auto"}}
                exit={{opacity: 0, height: 0}}
              >
                <label htmlFor="name">
                  <Typography variant="h6" color="blue-gray">
                    Nama
                  </Typography>
                </label>
                <Input
                  value={locationData.name}
                  onChange={(e) => setLocationData(prevLocationData => ({...prevLocationData, name: e.target.value}))}
                  size="lg"
                  placeholder="House 1"
                  error={!!fieldErrors?.name}
                  className={`${!!fieldErrors?.name ? "!border-t-red-500" : "!border-t-blue-gray-200 focus:!border-t-gray-900"}`}
                  labelProps={{
                    className: "before:content-none after:content-none",
                  }}
                />
                {fieldErrors?.name && (
                  <Typography color="red">{fieldErrors.name._errors}</Typography>
                )}
              </motion.div>

              <motion.div
                initial={{opacity: 0, height: 0}}
                animate={{opacity: 1, height: "auto"}}
                exit={{opacity: 0, height: 0}}
              >
                <label htmlFor="address">
                  <Typography variant="h6" color="blue-gray">
                    Alamat
                  </Typography>
                </label>
                <Textarea
                  value={locationData.address}
                  onChange={(e) => setLocationData(prevLocationData => ({...prevLocationData, address: e.target.value}))}
                  size="lg"
                  placeholder="142 Tess Harbor"
                  error={!!fieldErrors?.address}
                  className={`${!!fieldErrors?.address ? "!border-t-red-500" : "!border-t-blue-gray-200 focus:!border-t-gray-900"}`}
                  labelProps={{
                    className: "before:content-none after:content-none",
                  }}
                />
                {fieldErrors?.address && (
                  <Typography color="red">{fieldErrors.address._errors}</Typography>
                )}
              </motion.div>

              {mutationResponse?.failure && (
                <Typography variant="h6" color="red" className="-mb-4">
                  {mutationResponse.failure}
                </Typography>
              )}
            </AnimatePresence>
          </MotionConfig>
        </div>

        <div className={"flex gap-x-4 justify-end"}>
          <Button onClick={() => setDialogOpen(false)} variant={"outlined"} className="mt-6">
            Batal
          </Button>
          <Button
            disabled={isButtonDisabled || !hasChanges(initialLocationData, locationData)}
            onClick={() => mutation.mutate(locationData)}
            color={"blue"}
            className="mt-6"
            loading={mutation.isPending}
          >
            {(location && location.id) ? "Ubah" : "Buat"}
          </Button>
        </div>
      </form>
    </div>
  );
}
