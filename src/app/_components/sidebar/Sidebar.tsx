import {FaBed, FaCalendar, FaCog, FaDatabase, FaMoneyBill, FaTachometerAlt, FaUserFriends} from 'react-icons/fa';
import styles from './sidebar.module.css';
import {InteractiveUserDropdown, SidebarItem} from "@/app/_components/sidebar/SidebarItem";
import {Session} from 'next-auth';
import {FaChartBar, FaFileInvoiceDollar, FaKey, FaReceipt} from "react-icons/fa6";
import {getCompanyInfo} from "@/app/_db/settings";
import {IoIosAddCircleOutline} from "react-icons/io";

export interface SidebarProps {
    session: Session | null
}

export default async function Sidebar({session}: SidebarProps) {
    const companyInfo = await getCompanyInfo();

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
        {name: 'Layanan Tambahan', path: '/addons', icon: <IoIosAddCircleOutline />},
        {name: 'Pembayaran', path: '/payments', icon: <FaMoneyBill/>},
        {name: 'Tagihan', path: '/bills', icon: <FaReceipt/>},
        {
            name: 'Keuangan',
            path: '/financials',
            icon: <FaMoneyBill/>,
            children: [
                {name: 'Ringkasan', path: '/financials/summary', icon: <FaFileInvoiceDollar/>},
                {name: 'Pemasukan', path: '/financials/incomes', icon: <FaFileInvoiceDollar/>},
                {name: 'Pengeluaran', path: '/financials/expenses', icon: <FaFileInvoiceDollar/>},
                {name: 'Laporan', path: '/financials/reports', icon: <FaChartBar/>},
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

    return (
        <div className={`${styles.sidebar}`}>
            <div className={styles.sidebarContent}>
                <div className={styles.sidebarHeader}>
                    <img className={"max-h-16 !w-auto"} src={ companyInfo.companyImage ?? ""} alt={companyInfo.companyName ?? ""} />
                </div>
                <ul className={styles.sidebarMenu}>
                    {menuItems.map((item, index) => (
                        <SidebarItem key={index} {...item} />
                    ))}
                </ul>
                <div className={styles.sidebarFooter}>
                    <InteractiveUserDropdown user={session?.user}/>
                </div>
            </div>
        </div>
    );
}

