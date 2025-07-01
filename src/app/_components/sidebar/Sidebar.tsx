"use client";

import {FaBed, FaCalendar, FaCog, FaDatabase, FaMoneyBill, FaTachometerAlt, FaUserFriends, FaTools} from 'react-icons/fa';
import styles from './sidebar.module.css';
import {InteractiveUserDropdown, SidebarItem} from "@/app/_components/sidebar/SidebarItem";
import {Session} from 'next-auth';
import {FaFileInvoiceDollar, FaKey, FaReceipt} from "react-icons/fa6";
import {getCompanyInfo} from "@/app/_db/settings";
import {IoIosAddCircleOutline} from "react-icons/io";
import {PiGreaterThan} from "react-icons/pi";
import {motion} from 'framer-motion';
import {useHeader} from "@/app/_context/HeaderContext";
import {useEffect, useState} from "react";


export interface SidebarProps {
    session: Session | null
    companyInfo: Awaited<ReturnType<typeof getCompanyInfo>>
}

export default function Sidebar({session, companyInfo}: SidebarProps) {
    const { isSidebarOpen, setIsSidebarOpen } = useHeader();
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 720);
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const handleItemClick = () => {
        if (isMobile) {
            setIsSidebarOpen(false);
        }
    };

    const menuItems = [
        {name: 'Dashboard', path: '/dashboard', icon: <FaTachometerAlt/>},
        {
            name: 'Data Penghuni',
            path: '/residents',
            icon: <FaUserFriends/>,
            children: [
                {name: "Penyewa", path: '/residents/tenants'},
                {name: "Tamu", path: '/residents/guests'},
            ]
        },
        {
            name: 'Pusat Data',
            path: '/data-center',
            icon: <FaDatabase/>,
            children: [
                {name: 'Lokasi Properti', path: '/data-center/locations'},
                // {name: 'Denda', path: '/data-center/penalties'},
                // {name: 'Peraturan', path: '/data-center/rules'},
                // {name: 'Biaya', path: '/data-center/fees'},
                // {name: 'Pengeluaran', path: '/data-center/expenses'},
            ]
        },
        {
            name: 'Kamar',
            path: '/rooms',
            icon: <FaKey/>,
            children: [
                {name: 'Durasi Sewa', path: '/rooms/durations'},
                {name: 'Ketersediaan Kamar', path: '/rooms/availability'},
                {name: 'Semua Kamar', path: '/rooms/all-rooms'},
                {name: 'Tipe Kamar', path: '/rooms/types'},
                // {name: 'Status Kamar', path: '/rooms/status'},
            ]
        },
        {
            name: 'Jadwal',
            path: '/schedule',
            icon: <FaCalendar/>,
            children: [
                {name: 'Kalender', path: '/schedule/calendar'},
                {name: 'Buat Jadwal', path: '/schedule/create'},
            ]
        },
        // {name: 'Pendaftaran', path: '/registration', icon: <FaUserPlus/>},
        {name: 'Pemesanan', path: '/bookings', icon: <FaBed/>},
        {name: 'Layanan Tambahan', path: '/addons', icon: <IoIosAddCircleOutline/>},
        {name: 'Pembayaran', path: '/payments', icon: <FaMoneyBill/>},
        {name: 'Tagihan', path: '/bills', icon: <FaReceipt/>},
        {name: 'Maintenance', path: '/maintenance', icon: <FaTools/>},
        {
            name: 'Keuangan',
            path: '/financials',
            icon: <FaMoneyBill/>,
            children: [
                {name: 'Ringkasan', path: '/financials/summary', icon: <FaFileInvoiceDollar/>},
                {name: 'Pemasukan', path: '/financials/incomes', icon: <FaFileInvoiceDollar/>},
                {name: 'Pengeluaran', path: '/financials/expenses', icon: <FaFileInvoiceDollar/>},
                // {name: 'Laporan', path: '/financials/reports', icon: <FaChartBar/>},
            ]
        },
        {
            name: 'Pengaturan',
            path: '/settings',
            icon: <FaCog/>,
            children: [
                {name: 'Pengguna Situs', path: '/settings/users'},
                {name: 'Pengaturan Email', path: '/settings/email-settings'},
            ]
        },
    ];
    const toggleCollapsed = () => setIsSidebarOpen(a => !a);
    const sidebar = {
        width: isSidebarOpen ? "var(--sidebar-width)" : "var(--sidebar-collasped-width)",
    };
    return (
        <>
            <motion.div
                initial={{
                    translateX: "-100%"
                }}
                animate={{
                    translateX: isSidebarOpen ? "0" : "-100%",
                }}
                className={`${styles.sidebarBackdrop}`}
                onClick={() => setIsSidebarOpen(false)}
            />
            <motion.nav
                initial={sidebar}
                animate={sidebar}
                className={`${styles.sidebar} ${isSidebarOpen ? '' : styles.collapsed}`}
            >
                <div className={styles.sidebarContent}>
                    <div className={styles.sidebarHeader}>
                        <img src={companyInfo?.companyImage ?? ""} alt={companyInfo?.companyName ?? ""} className={styles.companyLogo}/>
                    </div>
                    <ul className={styles.sidebarMenu}>
                        {menuItems.map((item, index) => (
                            <SidebarItem key={index} {...item} onItemClick={handleItemClick} />
                        ))}
                    </ul>
                    <div className={styles.sidebarFooter}>
                        <InteractiveUserDropdown user={session?.user ?? null}/>
                    </div>
                </div>
                <div
                    className={`${styles.toggleBtn} ${isSidebarOpen ? 'rotate-180' : 'rotate-0'}`}
                    onClick={toggleCollapsed}
                >
                    <PiGreaterThan/>
                </div>
            </motion.nav>
        </>
    );
}

