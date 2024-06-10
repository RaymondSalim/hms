"use client";

import React, {ReactNode, useEffect, useRef, useState} from "react";
import {IconContext} from "react-icons";
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
} from "react-icons/fa";
import styles from "./styles/sidebar.module.css";
import {usePathname} from "next/navigation";
import Link from "next/link";
import {FaChevronDown} from "react-icons/fa6";
import {motion} from "framer-motion";
import {CiLogout} from "react-icons/ci";

export default function Sidebar() {
    const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const userAvatarRef = useRef<HTMLDivElement>(null);

    const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
        if (!event.relatedTarget || !dropdownRef.current?.contains(event.relatedTarget as Node)) {
            if (event.relatedTarget != userAvatarRef.current) {
                setIsUserDropdownOpen(false);
            }
        }
    };

    const toggleUserDropdown = () => {
        setIsUserDropdownOpen(prevState => {
            if (!prevState) {
                dropdownRef.current?.focus();
            }

            return !prevState;
        });
    };

    useEffect(() => {
        console.log(isUserDropdownOpen);
    }, [isUserDropdownOpen]);


    const menuItems = [
        {name: 'Dashboard', path: '/dashboard', icon: <FaTachometerAlt size={"none"}/>},
        {
            name: 'Data Center',
            path: '/data-center',
            icon: <FaDatabase/>,
            children: [
                {name: 'Administrators', path: '/data-center/administrators'},
                {name: 'Normal Users', path: '/data-center/normal-users'},
                {name: 'Property Locations', path: '/data-center/property-locations'},
                {name: 'Email Settings', path: '/data-center/email-settings'},
                {name: 'Rooms', path: '/data-center/rooms'},
                {name: 'Penalties', path: '/data-center/penalties'},
                {name: 'Rules', path: '/data-center/rules'},
                {name: 'Fees', path: '/data-center/fees'},
                {name: 'Expenses', path: '/data-center/expenses'},
            ]
        },
        {name: 'Registrations', path: '/registration', icon: <FaUserPlus/>},
        {name: 'Bookings', path: '/bookings', icon: <FaBed/>},
        {name: 'Payments', path: '/payments', icon: <FaMoneyBill/>},
        {name: 'Incomes', path: '/incomes', icon: <FaFileInvoiceDollar/>},
        {name: 'Expenses', path: '/expenses', icon: <FaFileInvoiceDollar/>},
        {name: 'Reports', path: '/reports', icon: <FaChartBar/>},
        {name: 'Guests', path: '/guests', icon: <FaUserFriends/>},
        {name: 'Settings', path: '/settings', icon: <FaCog/>},
    ];

    return (
        <div className={`${styles.sidebar}`}>
            <div className={styles.sidebarContent}>
                <div className={styles.sidebarHeader}>
                    {/*TODO! Dynamically get Icon*/}
                    <h2>Hotel Management System</h2>
                </div>
                <ul className={styles.sidebarMenu}>
                    <IconContext.Provider value={{size: "none"}}>
                        {menuItems.map((item, index) => (
                            <SidebarItem key={index} {...item} />
                        ))}
                    </IconContext.Provider>
                </ul>
                <div className={styles.sidebarFooter}>
                    <div>
                        <div
                            className={`group/footerUser ${styles.footerUser}`}
                            onClick={toggleUserDropdown}
                            ref={userAvatarRef}
                            tabIndex={0}
                        >
                            <div className={`${styles.userAvatar} group-hover/footerUser:border-opacity-100`}>
                                {/*TODO! Image*/}
                                <span>US</span>
                            </div>
                            <FaChevronDown className={`${styles.userDropdownIcon} group-hover/footerUser:opacity-100`}/>
                        </div>
                        <motion.div
                            initial={{
                                scale: 0,
                                transformOrigin: "left bottom"
                            }}
                            animate={isUserDropdownOpen ? {scale: 1} : undefined}
                            className={styles.footerUserDropdown}
                            ref={dropdownRef}
                            tabIndex={-1}
                            onBlur={handleBlur}
                        >
                            <div className={styles.userInfo}>
                                {/*TODO! User Info*/}
                                <span>Frank O'Neil</span>
                                <span>relations@firepress.org</span>
                            </div>
                            <ul className={styles.dropdownList}>
                                {/*TODO! Links!*/}
                                <li><Link href="/whats-new">What's new?</Link></li>
                                <li><Link href="/profile">Your profile</Link></li>
                                <li><Link href="/help-center">Help center</Link></li>
                                <li><Link href="/resources-guides">Resources & guides</Link></li>
                                <li><Link href="/sign-out">Sign out</Link></li>
                            </ul>
                        </motion.div>
                    </div>
                    <div className={styles.footerOptions}>
                        <div title={"Logout"} className={styles.logoutBtn}>
                            <CiLogout/>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


interface SidebarItemProps {
    name: string;
    path: string;
    icon: ReactNode;
    children?: Array<{ name: string; path: string }>;
}

function SidebarItem({name, path, icon, children}: SidebarItemProps) {
    const pathName = usePathname();
    const [isOpen, setIsOpen] = useState(false);

    const toggleDropdown = () => {
        setIsOpen(!isOpen);
    };

    return (
        <li className={`${styles.menuItem} ${pathName.startsWith(path) ? styles.active : ''}`}>
            <div className={`group/itemHeader ${styles.itemHeader}`}>
                <Link href={path} className={`${styles.item} group-hover/itemHeader:text-white`}>
                    <span className={styles.icon}>{icon}</span>
                    <span className={styles.text}>{name}</span>
                </Link>
                {children && (
                    <span className={`${styles.dropdownIcon} ${isOpen ? styles.open : ''}`} onClick={toggleDropdown}>
            <FaChevronDown/>
          </span>
                )}
            </div>
            {children && (
                <motion.ul
                    initial={{height: 0}}
                    animate={isOpen ? {height: "auto"} : undefined}
                    className={styles.dropdownMenu}
                >
                    {children.map((child, index) => (
                        <li key={index}
                            className={`group/childMenuItem ${styles.menuItem} ${pathName === child.path ? styles.active : ''}`}>
                            <Link href={child.path} className={`${styles.item} group-hover/childMenuItem:text-white`}>
                                <span className={styles.text}>{child.name}</span>
                            </Link>
                        </li>
                    ))}
                </motion.ul>
            )}
        </li>
    );
};
