"use client";

import Link from 'next/link';
import {usePathname} from "next/navigation";

import styles from "./styles/sidebar.module.css";

import { IconContext } from "react-icons";
import { FaTachometerAlt, FaDatabase, FaUserPlus, FaBed, FaMoneyBill, FaFileInvoiceDollar, FaChartBar, FaUserFriends, FaCog, FaBell } from "react-icons/fa";

export default function Sidebar() {
  const pathName = usePathname();

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <FaTachometerAlt size={"none"} /> },
    { name: 'Data Center', path: '/data-center', icon: <FaDatabase /> },
    { name: 'Registrations', path: '/registration', icon: <FaUserPlus /> },
    { name: 'Bookings', path: '/bookings', icon: <FaBed /> },
    { name: 'Payments', path: '/payments', icon: <FaMoneyBill /> },
    { name: 'Incomes', path: '/incomes', icon: <FaFileInvoiceDollar /> },
    { name: 'Expenses', path: '/expenses', icon: <FaFileInvoiceDollar /> },
    { name: 'Reports', path: '/reports', icon: <FaChartBar /> },
    { name: 'Guests', path: '/guests', icon: <FaUserFriends /> },
    { name: 'Settings', path: '/settings', icon: <FaCog /> },
  ];

  return (
    <div className={`${styles.sidebar}`}>
      <div className={styles.sidebarContent}>
        <div className={styles.sidebarHeader}>
          <h2>Hotel Management System</h2>
        </div>
        <ul className={styles.sidebarMenu}>
          <IconContext.Provider value={{size: "none"}}>
            {menuItems.map((item, index) => (
              <li key={index} className={pathName.startsWith(item.path) ? styles.active : ''}>
                <Link href={item.path} className={styles.item}>
                  <span className={styles.icon}>{item.icon}</span>
                  <span className={styles.text}>{item.name}</span>
                </Link>
              </li>
            ))}
          </IconContext.Provider>
        </ul>
      </div>
    </div>
  );
};
