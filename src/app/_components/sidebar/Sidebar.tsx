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
import {FaKey, FaMoneyBill1} from "react-icons/fa6";

export interface SidebarProps {
    session: Session | null
}

export default function Sidebar({session}: SidebarProps) {
    const menuItems = [
        { name: 'Dashboard', path: '/dashboard', icon: <FaTachometerAlt /> },
        {
            name: 'Data Center',
            path: '/data-center',
            icon: <FaDatabase />,
            children: [
                {name: 'Property Locations', path: '/data-center/locations'},
                { name: 'Email Settings', path: '/data-center/email-settings' },
                { name: 'Penalties', path: '/data-center/penalties' },
                { name: 'Rules', path: '/data-center/rules' },
                { name: 'Fees', path: '/data-center/fees' },
                { name: 'Expenses', path: '/data-center/expenses' },
            ]
        },
        {
            name: 'Rooms',
            path: '/rooms',
            icon: <FaKey/>,
            children: [
                {name: 'All Rooms', path: '/rooms/all-rooms'},
                {name: 'Room Types', path: '/rooms/types'},
                {name: 'Room Status', path: '/rooms/status'},
                {name: 'Durations', path: '/rooms/durations'},
            ]
        },
        { name: 'Registrations', path: '/registration', icon: <FaUserPlus /> },
        { name: 'Bookings', path: '/bookings', icon: <FaBed /> },
        { name: 'Payments', path: '/payments', icon: <FaMoneyBill /> },
        {
            name: 'Financials',
            path: '/financials',
            icon: <FaMoneyBill1/>,
            children: [
                {name: 'Incomes', path: '/incomes', icon: <FaFileInvoiceDollar/>},
                {name: 'Expenses', path: '/expenses', icon: <FaFileInvoiceDollar/>},
                {name: 'Reports', path: '/reports', icon: <FaChartBar/>},
            ]
        },
        {
            name: 'Residents',
            path: '/residents',
            icon: <FaUserFriends/>,
            children: [
                {name: "Tenants", path: '/residents/tenants'},
                {name: "Guests", path: '/residents/guests'},
            ]
        },
        {
            name: 'Settings',
            path: '/settings',
            icon: <FaCog/>,
            children: [
                {name: 'Site Users', path: '/settings/users'},
            ]
        },
    ];

    return (
      <div className={`${styles.sidebar}`}>
          <div className={styles.sidebarContent}>
              <div className={styles.sidebarHeader}>
                  <h2>Hotel Management System</h2>
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

