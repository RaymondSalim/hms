"use client";

import {Dispatch, SetStateAction, useEffect, useState} from "react";
import {motion} from "framer-motion";
import {Button, Input, Step, Stepper, Typography} from "@material-tailwind/react";
import {useMutation} from "@tanstack/react-query";
import {validateFinalData, validateStepData} from "@/app/(internal)/first-time-setup/setup-action";
import {fileToBase64} from "@/app/_lib/util";
import {toast} from "react-toastify";
import {useRouter} from "next/navigation";

export interface FormData {
    companyName: string;
    companyImage?: string;
    locationName: string;
    locationAddress: string;
}

export default function Setup() {
    const router = useRouter();

    const [activeStep, setActiveStep] = useState(0);
    const [isLastStep, setIsLastStep] = useState(false);
    const [isFirstStep, setIsFirstStep] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const [formData, setFormData] = useState<FormData>({
        companyName: "",
        locationName: "",
        locationAddress: "",
    });

    // Mutation for validating data at each step
    const stepMutation = useMutation({
        mutationFn: validateStepData,
        onError: (error: any) => {
            toast.error("Terjadi Kesalahan Server");
        },
        onSuccess: (data) => {
            if (data?.success) {
                handleNext();
                return;
            }
            toast.error("Mohon periksa kembali input anda.");
        },
        onSettled: () => {
            setIsLoading(false);
        }
    });

    // Mutation for validating and submitting final data
    const finalMutation = useMutation({
        mutationFn: validateFinalData,
        onError: (error: any) => {
            toast.error("Terjadi Kesalahan Server");
        },
        onSuccess: (data) => {
            if (data?.success) {
                toast.success("Berhasil! Mengalihkan...", {
                    onClose: () => {
                        router.push("/dashboard");
                    }
                });
                return;
            }
            toast.error("Mohon periksa kembali input anda.");
        },
        onSettled: () => {
            setIsLoading(false);
        }
    });

    const handleNext = () => {
        if (activeStep === 1) {
            if (formData.companyName.length == 0 && (formData.companyImage?.length ?? 0) == 0) {
                return;
            }
        }

        if (activeStep === 2) {
            if (formData.locationName.length == 0 && formData.locationAddress.length == 0) {
                return;
            }
        }

        if (!isLastStep) setActiveStep((cur) => cur + 1);
    };

    const handlePrev = () => {
        if (!isFirstStep) setActiveStep((cur) => cur - 1);
    };

    const handleStepValidation = () => {
        if (activeStep == 0) {
            handleNext();
            return;
        }
        setIsLoading(true);
        // Perform step validation before moving to the next step
        const stepData = activeStep === 1
            ? {companyName: formData.companyName, companyImage: formData.companyImage}
            : {locationName: formData.locationName, locationAddress: formData.locationAddress};

        stepMutation.mutate(stepData);
    };

    const handleSubmit = () => {
        setIsLoading(true);
        // @ts-expect-error mapping error
        finalMutation.mutate(formData); // Validate and submit all form data
    };

    return (
        <div className="flex w-full h-screen items-center justify-center overflow-auto">
            <div className="max-w-md w-full bg-white p-8 shadow-lg rounded-lg">
                {/* @ts-expect-error weird react 19 types error */}
                <Stepper
                    activeStep={activeStep}
                    isLastStep={(value) => setIsLastStep(value)}
                    isFirstStep={(value) => setIsFirstStep(value)}
                >
                    {/* @ts-expect-error weird react 19 types error */}
                    <Step onClick={() => setActiveStep(0)}>0</Step>
                    {/* @ts-expect-error weird react 19 types error */}
                    <Step onClick={() => setActiveStep(1)}>1</Step>
                    {/* @ts-expect-error weird react 19 types error */}
                    <Step onClick={() => setActiveStep(1)}>2</Step>
                </Stepper>

                <motion.div
                    key={activeStep}
                    initial={{opacity: 0, x: 100}}
                    animate={{opacity: 1, x: 0}}
                    exit={{opacity: 0, x: -100}}
                    transition={{duration: 0.5}}
                >
                    {activeStep === 0 && <Introduction/>}
                    {activeStep === 1 && <Step1 formData={formData} setFormData={setFormData}/>}
                    {activeStep === 2 && <Step2 formData={formData} setFormData={setFormData}/>}
                </motion.div>

                <div className="flex justify-between mt-6">
                    {activeStep > 0 && (
                        /* @ts-expect-error weird react 19 types error */
                        <Button color="gray" onClick={handlePrev}>
                            Sebelumnya
                        </Button>
                    )}
                    {activeStep < 2 ? (
                        /* @ts-expect-error weird react 19 types error */
                        <Button
                            loading={isLoading}
                            color="blue"
                            onClick={handleStepValidation}
                            disabled={
                                activeStep == 0 ? false :
                                    (formData.companyName.length == 0 || (formData.companyImage?.length ?? 0) == 0)
                            }
                        >
                            Selanjutnya
                        </Button>
                    ) : (
                        /* @ts-expect-error weird react 19 types error */
                        <Button
                            loading={isLoading || finalMutation.isPending}
                            color="green"
                            onClick={handleSubmit}
                            disabled={finalMutation.isPending || (formData.locationName.length == 0 || formData.locationAddress.length == 0)}
                        >
                            Kirim
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

const Introduction = () => {
    return (
        <div className="flex flex-col gap-6 text-center">
            <h2 className="text-2xl font-semibold">Selamat Datang!</h2>
            {/* @ts-expect-error weird react 19 types error */}
            <Typography color={"gray"}>
                Sepertinya ini adalah pertama kalinya Anda menjalankan aplikasi ini. Kami akan memandu Anda melalui
                proses pengaturan awal.
            </Typography>
            {/* @ts-expect-error weird react 19 types error */}
            <Typography color={"gray"}>
                Jangan khawatir, proses ini cepat dan mudah. Cukup klik &quot;Selanjutnya&quot; untuk memulai.
            </Typography>
        </div>
    );
};

interface StepProps {
    formData: FormData;
    setFormData: Dispatch<SetStateAction<FormData>>;
}

const Step1 = ({formData, setFormData}: StepProps) => {
    const [image, setImage] = useState<File | undefined>(undefined);
    useEffect(() => {
        if (image) {
            if (image.size > 2048000) {
                toast.error("Ukuran Gambar Terlalu Besar");
                return;
            }
            fileToBase64(image)
                .then((b64String) => {
                    setFormData(d => ({
                        ...d,
                        companyImage: b64String
                    }));
                });
        } else {
            setFormData(d => ({
                ...d,
                companyImage: undefined
            }));
        }
    }, [image]);

    return (
        <div className="flex flex-col gap-6">
            <h2 className="text-xl font-semibold">Langkah 1: Informasi Perusahaan</h2>
            {/* @ts-expect-error weird react 19 types error */}
            <Input
                label="Nama Perusahaan"
                value={formData.companyName}
                onChange={(e) => {
                    setFormData(fd => ({
                        ...fd,
                        companyName: e.target.value,
                    }));
                }}
            />
            {/* @ts-expect-error weird react 19 types error */}
            <Input
                label={"Logo Perusahaan"}
                type="file"
                accept="image/*"
                onChange={(e) =>
                    setImage(e.target.files?.[0])
                }
            />
            {formData.companyImage && (
                <img
                    src={image && URL.createObjectURL(image)}
                    alt="Company Logo"
                    className="self-center mt-4 h-32 w-32 object-cover"
                />
            )}
        </div>
    );
};

const Step2 = ({formData, setFormData}: StepProps) => {
    return (
        <div className="flex flex-col gap-6">
            <h2 className="text-xl font-semibold">Langkah 2: Informasi Lokasi</h2>
            {/* @ts-expect-error weird react 19 types error */}
            <Input
                label="Nama Lokasi"
                value={formData.locationName}
                onChange={(e) =>
                    setFormData(fd => ({
                        ...fd,
                        locationName: e.target.value,
                    }))
                }
            />
            {/* @ts-expect-error weird react 19 types error */}
            <Input
                label="Alamat Lokasi"
                value={formData.locationAddress}
                onChange={(e) =>
                    setFormData(fd => ({
                        ...fd,
                        locationAddress: e.target.value,
                    }))
                }
            />
        </div>
    );
};