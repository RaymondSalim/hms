"use client";

import {ToastContainer} from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import React from "react";

interface ToastProviderProps {
    children: React.ReactNode;
}

export default function ToastProvider({ children }: ToastProviderProps) {
    return (
        <>
            {children}
            <ToastContainer
                position="bottom-left"
            />
        </>
    );
}
