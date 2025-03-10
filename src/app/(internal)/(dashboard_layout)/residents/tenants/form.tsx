"use client";

import {TableFormProps} from "@/app/_components/pageContent/TableContent";
import React, {useEffect, useState} from "react";
import {Button, Checkbox, Input, Textarea, Typography} from "@material-tailwind/react";
import {TenantWithRooms} from "@/app/_db/tenant";
import {PhoneInput} from "@/app/_components/input/phoneInput";
import {ZodFormattedError} from "zod";
import {AnimatePresence, motion, MotionConfig} from "framer-motion";
import {toast} from "react-toastify";
import {fileToBase64} from "@/app/_lib/util";
import {NonUndefined} from "@/app/_lib/types";

interface TenantFormProps extends TableFormProps<TenantWithRooms> {
}

type FileData = {
    fileName: string,
    fileType: string,
    b64File: string
};

type DataType = Partial<NonUndefined<TenantFormProps['contentData']>> & {
    id_file_data?: FileData
    family_certificate_file_data?: FileData
    second_resident_id_file_data?: FileData
};

export function TenantForm(props: TenantFormProps) {
    const [tenantData, setTenantData] = useState<DataType>(props.contentData ?? {});
    const [fieldErrors, setFieldErrors] = useState<ZodFormattedError<DataType> | undefined>(props.mutationResponse?.errors);

    const [hasEmergencyContact, setHasEmergencyContact] = useState(false);
    const [hasSecondTenant, setHasSecondTenant] = useState(false);

    const [idImage, setIDImage] = useState<File | undefined>(undefined);
    const [secondResidentIDImage, setSecondResidentIDImage] = useState<File | undefined>(undefined);
    const [familyIDImage, setFamilyIDImage] = useState<File | undefined>(undefined);
    useEffect(() => {
        if (idImage) {
            fileToBase64(idImage)
                .then((b64String): void => {
                    setTenantData(d => ({
                        ...d,
                        id_file_data: {
                            fileName: idImage.name,
                            fileType: idImage.type,
                            b64File: b64String ?? ""
                        }
                    }));
                });
        } else {
            setTenantData(d => ({
                ...d,
                id_file_data: undefined
            }));
        }
    }, [idImage]);
    useEffect(() => {
        if (secondResidentIDImage) {
            fileToBase64(secondResidentIDImage)
                .then((b64String): void => {
                    setTenantData(d => ({
                        ...d,
                        second_resident_id_file_data: {
                            fileName: secondResidentIDImage.name,
                            fileType: secondResidentIDImage.type,
                            b64File: b64String ?? ""
                        }
                    }));
                });
        } else {
            setTenantData(d => ({
                ...d,
                second_resident_id_file: undefined
            }));
        }
    }, [secondResidentIDImage]);
    useEffect(() => {
        if (familyIDImage) {
            fileToBase64(familyIDImage)
                .then((b64String): void => {
                    setTenantData(d => ({
                        ...d,
                        family_certificate_file_data: {
                            fileName: familyIDImage.name,
                            fileType: familyIDImage.type,
                            b64File: b64String ?? ""
                        }
                    }));
                });
        } else {
            setTenantData(d => ({
                ...d,
                family_certificate_file_data: undefined
            }));
        }
    }, [familyIDImage]);

    useEffect(() => {
        if (
            tenantData.second_resident_name ||
            tenantData.second_resident_phone ||
            tenantData.second_resident_email ||
            tenantData.second_resident_id_number ||
            tenantData.second_resident_id_file ||
            tenantData.second_resident_relation
        ) setHasSecondTenant(true);
        if (tenantData.emergency_contact_name) setHasEmergencyContact(true);
    }, [tenantData]);

    useEffect(() => {
        setFieldErrors(props.mutationResponse?.errors);
    }, [props.mutationResponse?.errors]);

    return (
        <div className={"w-full px-8 py-4"}>
            <h1 className={"text-xl font-semibold text-black"}>{props.contentData ? "Perubahan" : "Pembuatan"} Penyewa</h1>
            <form className={"mt-4"}>
                <div className="mb-1 flex flex-col gap-6">
                    <MotionConfig
                        key={"payment_form"}
                        transition={{duration: 0.5}}
                    >
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
                                onChange={(e) => setTenantData(prevTenant => ({
                                    ...prevTenant,
                                    name: e.target.value
                                }))}
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
                            <label htmlFor="id">
                                <Typography variant="h6" color="blue-gray">
                                    Nomor Identitas
                                </Typography>
                            </label>
                            <Input
                                variant="outlined"
                                name="id"
                                value={tenantData.id_number}
                                onChange={(e) => setTenantData(prevTenant => ({
                                    ...prevTenant,
                                    id_number: e.target.value
                                }))}
                                size="lg"
                                error={!!fieldErrors?.id_number}
                                className={`${!!fieldErrors?.id_number ? "!border-t-red-500" : "!border-t-blue-gray-200 focus:!border-t-gray-900"}`}
                                labelProps={{
                                    className: "before:content-none after:content-none",
                                }}
                            />
                            {
                                fieldErrors?.id_number &&
                                <Typography color="red">{fieldErrors?.id_number._errors}</Typography>
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
                                onChange={(e) => setTenantData(prevTenant => ({
                                    ...prevTenant,
                                    email: e.target.value
                                }))}
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
                                placeholder="Nomor Telepon"
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
                            <label htmlFor="id">
                                <Typography variant="h6" color="blue-gray">
                                    Alamat
                                </Typography>
                            </label>
                            <Textarea
                                value={tenantData.current_address ?? undefined}
                                onChange={(e) => setTenantData(prevTenant => ({
                                    ...prevTenant,
                                    current_address: e.target.value.length > 0 ? e.target.value : null
                                }))}
                                size="lg"
                                error={!!fieldErrors?.current_address}
                                className=" !border-t-blue-gray-200 focus:!border-t-gray-900"
                                labelProps={{
                                    className: "before:content-none after:content-none",
                                }}
                            />
                            {
                                fieldErrors?.current_address &&
                                <Typography color="red">{fieldErrors?.current_address._errors}</Typography>
                            }
                        </div>
                        <div>
                            <label htmlFor="id">
                                <Typography variant="h6" color="blue-gray">
                                    KTP/SIM
                                </Typography>
                            </label>
                            <input type="file" accept="image/png, image/jpg, image/jpeg, image/webp"
                                   onChange={(e) => {
                                       const file = e.target.files?.[0];
                                       if (file?.size && file?.size > 5120000) {
                                           toast.error("Ukuran Gambar Terlalu Besar");
                                           e.target.value = "";
                                       } else {
                                           setIDImage(file);
                                       }
                                   }}
                                   className="w-full font-semibold text-sm bg-white border file:cursor-pointer cursor-pointer file:border-0 file:py-3 file:px-4 file:mr-4 file:bg-gray-100 file:hover:bg-gray-200 file:text-gray-500 rounded"/>
                            <p className="text-xs mt-2">PNG, JPG, JPEG, WEBP diperbolehkan. Ukuran maksimum
                                gambar adalah 5MB</p>
                            {
                                fieldErrors?.id_file_data &&
                                <Typography color="red">{fieldErrors?.id_file_data._errors}</Typography>
                            }
                        </div>
                        <div>
                            <AnimatePresence>
                                <Checkbox
                                    label={
                                        <Typography color="blue-gray" className="font-medium">
                                            Tambahkan Kontak Darurat
                                        </Typography>
                                    }
                                    checked={hasEmergencyContact}
                                    onChange={(e) => setHasEmergencyContact(e.target.checked)}
                                    containerProps={{
                                        className: "-ml-3",
                                    }}
                                />
                                {
                                    hasEmergencyContact &&
                                    <motion.div
                                        key={"emergency_contact"}
                                        initial={{opacity: 0, height: 0}}
                                        animate={{opacity: 1, height: "auto"}}
                                        exit={{opacity: 0, height: 0}}
                                        className={"mt-4 flex flex-col gap-6"}
                                    >
                                        <Typography className={"-mb-4"} variant="h5" color="blue-gray">
                                            Kontak Darurat
                                        </Typography>
                                        <div>
                                            <label htmlFor="name">
                                                <Typography variant="h6" color="blue-gray">
                                                    Nama
                                                </Typography>
                                            </label>
                                            <Input
                                                variant="outlined"
                                                name="name"
                                                value={tenantData.emergency_contact_name ?? undefined}
                                                onChange={(e) => setTenantData(prevTenant => ({
                                                    ...prevTenant,
                                                    emergency_contact_name: e.target.value.length > 0 ? e.target.value : null
                                                }))}
                                                size="lg"
                                                placeholder="John Smith"
                                                error={!!fieldErrors?.emergency_contact_name}
                                                className={`${!!fieldErrors?.emergency_contact_name ? "!border-t-red-500" : "!border-t-blue-gray-200 focus:!border-t-gray-900"}`}
                                                labelProps={{
                                                    className: "before:content-none after:content-none",
                                                }}
                                            />
                                            {
                                                fieldErrors?.emergency_contact_name &&
                                                <Typography
                                                    color="red">{fieldErrors?.emergency_contact_name._errors}</Typography>
                                            }
                                        </div>
                                        <div>
                                            <label htmlFor="phone">
                                                <Typography variant="h6" color="blue-gray">
                                                    Nomor Telepon
                                                </Typography>
                                            </label>
                                            <PhoneInput
                                                phoneNumber={tenantData.emergency_contact_phone}
                                                setPhoneNumber={(p) => setTenantData(prevTenantData => ({
                                                    ...prevTenantData,
                                                    emergency_contact_phone: p.length > 0 ? p : null
                                                }))}
                                                type="tel"
                                                error={!!fieldErrors?.emergency_contact_phone}
                                                className={`${!!fieldErrors?.emergency_contact_phone ? "!border-t-red-500" : "!border-t-blue-gray-200 focus:!border-t-gray-900"}`}
                                                labelProps={{
                                                    className: "before:content-none after:content-none",
                                                }}
                                                containerProps={{
                                                    className: "min-w-0",
                                                }}
                                            />
                                            {
                                                fieldErrors?.emergency_contact_phone &&
                                                <Typography
                                                    color="red">{fieldErrors?.emergency_contact_phone._errors}</Typography>
                                            }
                                        </div>
                                    </motion.div>
                                }
                            </AnimatePresence>
                        </div>
                        <div>
                            <AnimatePresence>
                                <Checkbox
                                    label={
                                        <div>
                                            <Typography color="blue-gray" className="font-medium">
                                                Ada Penghuni Kedua
                                            </Typography>
                                        </div>
                                    }
                                    containerProps={{
                                        className: "-ml-3",
                                    }}
                                    checked={hasSecondTenant}
                                    onChange={(e) => setHasSecondTenant(e.target.checked)}
                                />
                                {
                                    hasSecondTenant &&
                                    <motion.div
                                        key={"second_tenant"}
                                        initial={{opacity: 0, height: 0}}
                                        animate={{opacity: 1, height: "auto"}}
                                        exit={{opacity: 0, height: 0}}
                                        className={"mt-4 flex flex-col gap-6"}
                                    >

                                        <Typography className={"-mb-4"} variant="h5" color="blue-gray">
                                            Penghuni Kedua
                                        </Typography>
                                        <div>
                                            <label htmlFor="second_tenant_name">
                                                <Typography variant="h6" color="blue-gray">
                                                    Nama
                                                </Typography>
                                            </label>
                                            <Input
                                                variant="outlined"
                                                name="second_tenant_name"
                                                value={tenantData.second_resident_name ?? ""}
                                                onChange={(e) => setTenantData(prevTenant => ({
                                                    ...prevTenant,
                                                    second_resident_name: e.target.value
                                                }))}
                                                size="lg"
                                                placeholder="John Smith"
                                                error={!!fieldErrors?.second_resident_name}
                                                className={`${!!fieldErrors?.second_resident_name ? "!border-t-red-500" : "!border-t-blue-gray-200 focus:!border-t-gray-900"}`}
                                                labelProps={{
                                                    className: "before:content-none after:content-none",
                                                }}
                                            />
                                            {
                                                fieldErrors?.second_resident_name &&
                                                <Typography
                                                    color="red">{fieldErrors?.second_resident_name._errors}</Typography>
                                            }
                                        </div>
                                        <div>
                                            <label htmlFor="second_tenant_relation">
                                                <Typography variant="h6" color="blue-gray">
                                                    Relasi
                                                </Typography>
                                            </label>
                                            <Input
                                                variant="outlined"
                                                name="second_tenant_relation"
                                                value={tenantData.second_resident_relation ?? ""}
                                                onChange={(e) => setTenantData(prevTenant => ({
                                                    ...prevTenant,
                                                    second_resident_relation: e.target.value
                                                }))}
                                                size="lg"
                                                placeholder="Saudara"
                                                error={!!fieldErrors?.second_resident_relation}
                                                className={`${!!fieldErrors?.second_resident_relation ? "!border-t-red-500" : "!border-t-blue-gray-200 focus:!border-t-gray-900"}`}
                                                labelProps={{
                                                    className: "before:content-none after:content-none",
                                                }}
                                            />
                                            {
                                                fieldErrors?.second_resident_relation &&
                                                <Typography
                                                    color="red">{fieldErrors?.second_resident_relation._errors}</Typography>
                                            }
                                        </div>
                                        <div>
                                            <label htmlFor="second_resident_id">
                                                <Typography variant="h6" color="blue-gray">
                                                    Nomor Identitas
                                                </Typography>
                                            </label>
                                            <Input
                                                variant="outlined"
                                                name="second_resident_id_number"
                                                value={tenantData.second_resident_id_number ?? ""}
                                                onChange={(e) => setTenantData(prevTenant => ({
                                                    ...prevTenant,
                                                    second_resident_id_number: e.target.value
                                                }))}
                                                size="lg"
                                                error={!!fieldErrors?.second_resident_id_number}
                                                className={`${!!fieldErrors?.second_resident_id_number ? "!border-t-red-500" : "!border-t-blue-gray-200 focus:!border-t-gray-900"}`}
                                                labelProps={{
                                                    className: "before:content-none after:content-none",
                                                }}
                                            />
                                            {
                                                fieldErrors?.second_resident_id_number &&
                                                <Typography
                                                    color="red">{fieldErrors?.second_resident_id_number._errors}</Typography>
                                            }
                                        </div>
                                        <div>
                                            <label htmlFor="second_resident_email">
                                                <Typography variant="h6" color="blue-gray">
                                                    Alamat Email
                                                </Typography>
                                            </label>
                                            <Input
                                                variant="outlined"
                                                name="second_resident_email"
                                                type={"email"}
                                                // @ts-ignore
                                                value={tenantData.second_resident_email}
                                                onChange={(e) => setTenantData(prevTenant => ({
                                                    ...prevTenant,
                                                    second_resident_email: e.target.value
                                                }))}
                                                size="lg"
                                                placeholder="john@smith.com"
                                                error={!!fieldErrors?.second_resident_email}
                                                className={`${!!fieldErrors?.second_resident_email ? "!border-t-red-500" : "!border-t-blue-gray-200 focus:!border-t-gray-900"}`}
                                                labelProps={{
                                                    className: "before:content-none after:content-none",
                                                }}
                                            />
                                            {
                                                fieldErrors?.second_resident_email &&
                                                <Typography
                                                    color="red">{fieldErrors?.second_resident_email._errors}</Typography>
                                            }
                                        </div>
                                        <div>
                                            <label htmlFor="second_resident_phone">
                                                <Typography variant="h6" color="blue-gray">
                                                    Nomor Telepon
                                                </Typography>
                                            </label>
                                            <PhoneInput
                                                phoneNumber={tenantData.second_resident_phone}
                                                setPhoneNumber={(p) => setTenantData(prevTenant => ({
                                                    ...prevTenant,
                                                    second_resident_phone: p
                                                }))}
                                                type="tel"
                                                placeholder="Nomor Telepon"
                                                error={!!fieldErrors?.second_resident_phone}
                                                className={`${!!fieldErrors?.second_resident_phone ? "!border-t-red-500" : "!border-t-blue-gray-200 focus:!border-t-gray-900"}`}
                                                labelProps={{
                                                    className: "before:content-none after:content-none",
                                                }}
                                                containerProps={{
                                                    className: "min-w-0",
                                                }}
                                            />
                                            {
                                                fieldErrors?.second_resident_phone &&
                                                <Typography
                                                    color="red">{fieldErrors?.second_resident_phone._errors}</Typography>
                                            }
                                        </div>
                                        <div>
                                            <label htmlFor="second_resident_id_file">
                                                <Typography variant="h6" color="blue-gray">
                                                    KTP/SIM
                                                </Typography>
                                            </label>
                                            <input type="file" accept="image/png, image/jpg, image/jpeg, image/webp"
                                                   onChange={(e) => {
                                                       const file = e.target.files?.[0];
                                                       if (file?.size && file?.size > 5120000) {
                                                           toast.error("Ukuran Gambar Terlalu Besar");
                                                           e.target.value = "";
                                                       } else {
                                                           setSecondResidentIDImage(file);
                                                       }
                                                   }}
                                                   className="w-full font-semibold text-sm bg-white border file:cursor-pointer cursor-pointer file:border-0 file:py-3 file:px-4 file:mr-4 file:bg-gray-100 file:hover:bg-gray-200 file:text-gray-500 rounded"/>
                                            <p className="text-xs mt-2">PNG, JPG, JPEG, WEBP diperbolehkan. Ukuran
                                                maksimum
                                                gambar adalah 5MB</p>
                                            {
                                                fieldErrors?.second_resident_id_file &&
                                                <Typography
                                                    color="red">{fieldErrors?.second_resident_id_file._errors}</Typography>
                                            }
                                        </div>
                                        <div>
                                            <label htmlFor="family_id">
                                                <Typography variant="h6" color="blue-gray">
                                                    Kartu Keluarga
                                                </Typography>
                                            </label>
                                            <input type="file" accept="image/png, image/jpg, image/jpeg, image/webp"
                                                   onChange={(e) => {
                                                       const file = e.target.files?.[0];
                                                       if (file?.size && file?.size > 5120000) {
                                                           toast.error("Ukuran Gambar Terlalu Besar");
                                                           e.target.value = "";
                                                       } else {
                                                           setFamilyIDImage(file);
                                                       }
                                                   }}
                                                   className="w-full font-semibold text-sm bg-white border file:cursor-pointer cursor-pointer file:border-0 file:py-3 file:px-4 file:mr-4 file:bg-gray-100 file:hover:bg-gray-200 file:text-gray-500 rounded"/>
                                            <p className="text-xs mt-2">PNG, JPG, JPEG, WEBP diperbolehkan. Ukuran
                                                maksimum
                                                gambar adalah 5MB</p>
                                            {
                                                fieldErrors?.family_certificate_file_data &&
                                                <Typography
                                                    color="red">{fieldErrors?.family_certificate_file_data._errors}</Typography>
                                            }
                                        </div>
                                    </motion.div>
                                }
                            </AnimatePresence>
                        </div>
                        <div>
                            <label htmlFor="referral_source">
                                <Typography variant="h6" color="blue-gray">
                                    Bagaimana anda mengetahui tentang MICASA Suites?
                                </Typography>
                            </label>
                            <Textarea
                                value={tenantData.referral_source ?? undefined}
                                onChange={(e) => setTenantData(prevTenant => ({
                                    ...prevTenant,
                                    referral_source: e.target.value.length > 0 ? e.target.value : null
                                }))}
                                size="lg"
                                error={!!fieldErrors?.referral_source}
                                className=" !border-t-blue-gray-200 focus:!border-t-gray-900"
                                labelProps={{
                                    className: "before:content-none after:content-none",
                                }}
                            />
                            {
                                fieldErrors?.referral_source &&
                                <Typography color="red">{fieldErrors?.referral_source._errors}</Typography>
                            }
                        </div>
                        {
                            props.mutationResponse?.failure &&
                            <Typography variant="h6" color="red" className="-mb-4">
                                {props.mutationResponse.failure}
                            </Typography>
                        }
                        {
                            props.mutationResponse &&
                            <Typography variant="h6" color="red" className="-mb-4">
                                Ada masalah di data yang anda masukan. Mohon periksa kembali.
                            </Typography>
                        }
                    </MotionConfig>
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
