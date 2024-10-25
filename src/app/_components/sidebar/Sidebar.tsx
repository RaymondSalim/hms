import {
    FaBed,
    FaChartBar,
    FaCog,
    FaDatabase,
    FaFileInvoiceDollar,
    FaMoneyBill,
    FaTachometerAlt,
    FaUserFriends,
    FaUserPlus
} from 'react-icons/fa';
import styles from './sidebar.module.css';
import {InteractiveUserDropdown, SidebarItem} from "@/app/_components/sidebar/SidebarItem";
import {Session} from 'next-auth';
import {FaKey, FaMoneyBill1, FaReceipt} from "react-icons/fa6";
import {getCompanyInfo} from "@/app/_db/settings";

export interface SidebarProps {
    session: Session | null
}

export default async function Sidebar({session}: SidebarProps) {
    const companyInfo = await getCompanyInfo();

    const menuItems = [
        {name: 'Dashboard', path: '/dashboard', icon: <FaTachometerAlt/>},
        {
            name: 'Pusat Data',
            path: '/data-center',
            icon: <FaDatabase/>,
            children: [
                {name: 'Lokasi Properti', path: '/data-center/locations'},
                {name: 'Pengaturan Email', path: '/data-center/email-settings'},
                {name: 'Denda', path: '/data-center/penalties'},
                {name: 'Peraturan', path: '/data-center/rules'},
                {name: 'Biaya', path: '/data-center/fees'},
                {name: 'Pengeluaran', path: '/data-center/expenses'},
            ]
        },
        {
            name: 'Kamar',
            path: '/rooms',
            icon: <FaKey/>,
            children: [
                {name: 'Semua Kamar', path: '/rooms/all-rooms'},
                {name: 'Ketersediaan Kamar', path: '/rooms/availability'},
                {name: 'Tipe Kamar', path: '/rooms/types'},
                {name: 'Status Kamar', path: '/rooms/status'},
                {name: 'Durasi', path: '/rooms/durations'},
            ]
        },
        {name: 'Pendaftaran', path: '/registration', icon: <FaUserPlus/>},
        {name: 'Pemesanan', path: '/bookings', icon: <FaBed/>},
        {name: 'Pembayaran', path: '/payments', icon: <FaMoneyBill/>},
        {name: 'Tagihan', path: '/bills', icon: <FaReceipt/>},
        {
            name: 'Keuangan',
            path: '/financials',
            icon: <FaMoneyBill1/>,
            children: [
                {name: 'Pemasukan', path: '/incomes', icon: <FaFileInvoiceDollar/>},
                {name: 'Pengeluaran', path: '/expenses', icon: <FaFileInvoiceDollar/>},
                {name: 'Laporan', path: '/reports', icon: <FaChartBar/>},
            ]
        },
        {
            name: 'Penghuni',
            path: '/residents',
            icon: <FaUserFriends/>,
            children: [
                {name: "Penyewa", path: '/residents/tenants'},
                {name: "Tamu", path: '/residents/guests'},
            ]
        },
        {
            name: 'Pengaturan',
            path: '/settings',
            icon: <FaCog/>,
            children: [
                {name: 'Pengguna Situs', path: '/settings/users'},
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

