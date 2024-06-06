"use client";

import { IconContext } from "react-icons";
import { FaTachometerAlt, FaDatabase, FaUserPlus, FaBed, FaMoneyBill, FaFileInvoiceDollar, FaChartBar, FaUserFriends, FaCog } from "react-icons/fa";
import styles from "./styles/sidebar.module.css";
import {usePathname} from "next/navigation";
import {useState} from "react";
import Link from "next/link";
import {FaChevronDown, FaChevronRight} from "react-icons/fa6";

export default function Sidebar() {
  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <FaTachometerAlt size={"none"} /> },
    {
      name: 'Data Center',
      path: '/data-center',
      icon: <FaDatabase />,
      children: [
        { name: 'Administrators', path: '/data-center/administrators' },
        { name: 'Normal Users', path: '/data-center/normal-users' },
        { name: 'Property Locations', path: '/data-center/property-locations' },
        { name: 'Email Settings', path: '/data-center/email-settings' },
        { name: 'Rooms', path: '/data-center/rooms' },
        { name: 'Penalties', path: '/data-center/penalties' },
        { name: 'Rules', path: '/data-center/rules' },
        { name: 'Fees', path: '/data-center/fees' },
        { name: 'Expenses', path: '/data-center/expenses' },
      ]
    },
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
          <IconContext.Provider value={{ size: "none" }}>
            {menuItems.map((item, index) => (
              <SidebarItem key={index} {...item} />
            ))}
          </IconContext.Provider>
        </ul>
      </div>
    </div>
  );
};


interface SidebarItemProps {
  name: string;
  path: string;
  icon: React.ReactNode;
  children?: Array<{ name: string; path: string }>;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ name, path, icon, children }) => {
  const pathName = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  return (
    <li className={`${styles.menuItem} ${pathName.startsWith(path) ? styles.active : ''}`}>
      <div className={styles.itemHeader}>
        <Link href={path} className={styles.item}>
          <span className={styles.icon}>{icon}</span>
          <span className={styles.text}>{name}</span>
        </Link>
        {children && (
          <span className={`${styles.dropdownIcon} ${isOpen ? styles.open : ''}`} onClick={toggleDropdown}>
            <FaChevronDown />
          </span>
        )}
      </div>
      {children && (
        <ul className={`${styles.dropdownMenu} ${isOpen ? styles.open : ''}`}>
          {children.map((child, index) => (
            <li key={index} className={`${styles.menuItem} ${pathName === child.path ? styles.active : ''}`}>
              <Link href={child.path} className={styles.item}>
                <span className={styles.text}>{child.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
};
